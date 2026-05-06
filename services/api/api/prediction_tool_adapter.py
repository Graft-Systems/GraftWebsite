from __future__ import annotations

import json
import os
import re
import sys
import time
from threading import Lock
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from django.conf import settings

_module_cache_lock = Lock()
_module_cache: tuple[Any, Any] | None = None
_model_cache_lock = Lock()
_model_cache_key: tuple[Any, ...] | None = None
_model_cache: tuple[Any, Any] | None = None

# v2 path: pretrained CNN backbone + joblib regressor.
_v2_cache_lock = Lock()
_v2_cache_key: tuple[Any, ...] | None = None
_v2_cache: dict[str, Any] | None = None

# Preprocessing constants — must match training in scripts/extract_cnn_features.py.
_IMAGENET_MEAN = (0.485, 0.456, 0.406)
_IMAGENET_STD = (0.229, 0.224, 0.225)
_DINOV2_SIZE = 518  # multiple of 14 (patch size)


def _resolve_backbone() -> tuple[str, dict | None]:
    """Resolve the active inference backbone.

    Sidecar `metadata.json` next to PREDICTION_MODEL_PATH wins over the env var
    (it's the source of truth for what feature dim the joblib expects).
    Returns (backbone_name, sidecar_metadata_or_None).
    """
    sidecar: dict | None = None
    model_path_str = getattr(settings, "PREDICTION_MODEL_PATH", "") or ""
    if model_path_str:
        meta_path = Path(model_path_str).with_name("metadata.json")
        if meta_path.exists():
            try:
                sidecar = json.loads(meta_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                sidecar = None
    if sidecar:
        for key in ("backbone", "backbone_name", "feature_extractor"):
            value = sidecar.get(key)
            if isinstance(value, str) and value:
                return value, sidecar
    env_backbone = os.environ.get("PREDICTION_BACKBONE", "").strip().lower()
    if env_backbone:
        return env_backbone, sidecar
    return "hand", sidecar


def _try_find_depth_pair(test_image: Path) -> Path | None:
    stem = test_image.stem
    rgb_to_depth = re.sub(r"rgb", "depth", stem, flags=re.IGNORECASE)
    color_to_depth = re.sub(r"color", "depth", stem, flags=re.IGNORECASE)
    candidates = [
        test_image.with_name(rgb_to_depth + test_image.suffix),
        test_image.with_name(color_to_depth + test_image.suffix),
        test_image.with_name(stem + "_depth" + test_image.suffix),
    ]
    for candidate in candidates:
        if candidate != test_image and candidate.exists():
            return candidate
    return None


def _load_prediction_modules() -> tuple[Any, Any]:
    """Dynamically import PredictionTool modules after adding src to sys.path."""
    global _module_cache
    if _module_cache is not None:
        return _module_cache

    with _module_cache_lock:
        if _module_cache is not None:
            return _module_cache

        src_dir = Path(settings.PREDICTION_TOOL_ROOT) / "src"
        if not src_dir.exists():
            raise FileNotFoundError(
                f"PredictionTool source directory not found: {src_dir}. "
                "Set PREDICTION_TOOL_ROOT in backend .env."
            )

        src_str = str(src_dir.resolve())
        if src_str not in sys.path:
            sys.path.insert(0, src_str)

        from grape_weight_tool.features import build_feature_vector  # type: ignore[import-not-found]
        from grape_weight_tool.train import train_or_load_model  # type: ignore[import-not-found]

        _module_cache = (
            train_or_load_model,
            build_feature_vector,
        )
        return _module_cache


def _get_cached_prediction_runtime() -> tuple[Any, Any]:
    global _model_cache, _model_cache_key
    train_or_load_model, build_feature_vector = _load_prediction_modules()

    train_dir = Path(settings.PREDICTION_TRAIN_DIR)
    train_csv = Path(settings.PREDICTION_TRAIN_CSV) if settings.PREDICTION_TRAIN_CSV else None
    model_path = (
        Path(settings.PREDICTION_MODEL_PATH) if settings.PREDICTION_MODEL_PATH else None
    )

    if not model_path and not train_dir.exists():
        raise FileNotFoundError(
            f"PREDICTION_TRAIN_DIR does not exist: {train_dir}. "
            "Set it in backend .env."
        )
    output_dir = Path(settings.PREDICTION_RUNS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    cache_key = (
        str(train_dir.resolve()),
        str(train_csv.resolve()) if train_csv and train_csv.exists() else "",
        str(model_path.resolve()) if model_path and model_path.exists() else "",
        str(output_dir.resolve()),
        int(settings.PREDICTION_RANDOM_STATE),
        float(settings.PREDICTION_VAL_FRACTION),
        bool(settings.PREDICTION_USE_RAW_DEPTH),
    )

    if _model_cache is not None and _model_cache_key == cache_key:
        return _model_cache

    with _model_cache_lock:
        if _model_cache is not None and _model_cache_key == cache_key:
            return _model_cache
        model = train_or_load_model(
            train_dir=train_dir,
            train_csv=train_csv,
            output_dir=output_dir,
            model_path=model_path,
            random_state=settings.PREDICTION_RANDOM_STATE,
            val_fraction=settings.PREDICTION_VAL_FRACTION,
            use_raw_depth=settings.PREDICTION_USE_RAW_DEPTH,
        )
        _model_cache_key = cache_key
        _model_cache = (model, build_feature_vector)
        return _model_cache


@dataclass
class InferenceResult:
    filename: str
    prediction_weight: float
    model: str
    unit: str = "kg"
    depth_used: str | None = None
    ground_truth_weight: float | None = None
    absolute_error: float | None = None
    latency_ms: int = 0

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "filename": self.filename,
            "prediction_weight": self.prediction_weight,
            "model": self.model,
            "unit": self.unit,
            "depth_used": self.depth_used,
            "latency_ms": self.latency_ms,
        }
        if self.ground_truth_weight is not None:
            payload["ground_truth_weight"] = self.ground_truth_weight
        if self.absolute_error is not None:
            payload["absolute_error"] = self.absolute_error
        return payload


def _load_v2_runtime() -> dict[str, Any]:
    """Load DINOv2 backbone + joblib regressor for the v2 inference path.

    Cached per-process by (backbone_name, model_path) so we don't reload on every request.
    Lazy-imports torch/torchvision/joblib so the v1 deploy still works without them.
    """
    global _v2_cache, _v2_cache_key

    backbone, sidecar = _resolve_backbone()
    model_path_str = getattr(settings, "PREDICTION_MODEL_PATH", "") or ""
    if not model_path_str:
        raise RuntimeError(
            "PREDICTION_MODEL_PATH is required when PREDICTION_BACKBONE is a CNN backbone."
        )
    model_path = Path(model_path_str).resolve()
    if not model_path.exists():
        raise FileNotFoundError(f"PREDICTION_MODEL_PATH does not exist: {model_path}")

    cache_key = (backbone, str(model_path), model_path.stat().st_mtime_ns)
    if _v2_cache is not None and _v2_cache_key == cache_key:
        return _v2_cache

    with _v2_cache_lock:
        if _v2_cache is not None and _v2_cache_key == cache_key:
            return _v2_cache

        try:
            import joblib  # type: ignore
            import torch  # type: ignore
            import torchvision.transforms as T  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "v2 inference path requires torch + torchvision + joblib. Install with: "
                "pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu"
            ) from exc

        if backbone == "dinov2_vits14":
            try:
                # Render can hit GitHub API/rate-limit validation issues when
                # torch.hub verifies repos. We trust this pinned upstream repo
                # and skip validation to avoid spurious auth failures.
                cnn = torch.hub.load(
                    "facebookresearch/dinov2",
                    "dinov2_vits14",
                    verbose=False,
                    trust_repo=True,
                    skip_validation=True,
                )
            except Exception as exc:
                raise RuntimeError(
                    f"Failed to load DINOv2 from torch.hub: {exc}. "
                    "Check internet access (first call downloads ~85MB) or pre-cache "
                    "at ~/.cache/torch/hub."
                ) from exc
            cnn.eval()
            transform = T.Compose([
                T.Resize((_DINOV2_SIZE, _DINOV2_SIZE), interpolation=T.InterpolationMode.BICUBIC),
                T.ToTensor(),
                T.Normalize(mean=list(_IMAGENET_MEAN), std=list(_IMAGENET_STD)),
            ])
        else:
            raise ValueError(
                f"Unsupported PREDICTION_BACKBONE for v2 path: {backbone!r}. "
                "Currently supported: 'dinov2_vits14'."
            )

        regressor = joblib.load(model_path)
        # Prefer the sidecar metadata's explicit model name (lets v4 / future
        # artifacts identify themselves accurately in PredictionBatch.model_name);
        # fall back to a generic name derived from the backbone if absent.
        model_name_str = (
            sidecar.get("model_name_for_adapter")
            if isinstance(sidecar, dict) and isinstance(sidecar.get("model_name_for_adapter"), str)
            else f"grape-weight-{backbone}-hgb"
        )

        _v2_cache_key = cache_key
        _v2_cache = {
            "backbone": backbone,
            "cnn": cnn,
            "transform": transform,
            "regressor": regressor,
            "model_name": model_name_str,
            "torch": torch,
            "sidecar": sidecar,
        }
        return _v2_cache


def _run_v2_inference(image_paths: list[Path]) -> list[dict[str, Any]]:
    """Inference path for CNN backbone + joblib regressor (v2)."""
    runtime = _load_v2_runtime()
    cnn = runtime["cnn"]
    transform = runtime["transform"]
    regressor = runtime["regressor"]
    model_name_str = runtime["model_name"]
    torch = runtime["torch"]

    from PIL import Image  # type: ignore  (Pillow ships with sklearn deps)

    results: list[dict[str, Any]] = []
    for image_path in image_paths:
        started = time.perf_counter()
        try:
            img = Image.open(image_path).convert("RGB")
        except Exception as exc:
            raise RuntimeError(f"Could not open image {image_path}: {exc}") from exc

        tensor = transform(img).unsqueeze(0)  # (1, 3, 518, 518) on CPU
        with torch.no_grad():
            feat = cnn(tensor)  # (1, 384)
        feature_vector = feat.cpu().numpy().astype(np.float32)
        prediction = float(regressor.predict(feature_vector)[0])
        # Convert grams to kilograms since InferenceResult defaults to unit="kg"
        prediction_kg = prediction / 1000.0
        elapsed = int((time.perf_counter() - started) * 1000)

        item = InferenceResult(
            filename=image_path.name,
            prediction_weight=prediction_kg,
            model=model_name_str,
            depth_used=None,
            latency_ms=elapsed,
        )
        results.append(item.to_payload())
    return results


def run_prediction_for_images(image_paths: list[Path]) -> list[dict[str, Any]]:
    output_dir = Path(settings.PREDICTION_RUNS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    backbone, _sidecar = _resolve_backbone()
    if backbone in {"hand", "", "rf", "v1"}:
        results = _run_v1_inference(image_paths)
    else:
        results = _run_v2_inference(image_paths)

    metrics_path = output_dir / "latest_api_metrics.json"
    metrics_path.write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
    return results


def _run_v1_inference(image_paths: list[Path]) -> list[dict[str, Any]]:
    """Original hand-features + RandomForest path. Unchanged behavior."""
    model, build_feature_vector = _get_cached_prediction_runtime()

    results: list[dict[str, Any]] = []
    for image_path in image_paths:
        started = time.perf_counter()
        depth_path = _try_find_depth_pair(image_path)

        features = build_feature_vector(
            image_path,
            depth_path,
            None,
            use_raw_depth=settings.PREDICTION_USE_RAW_DEPTH,
        )
        prediction = float(model.predict(np.asarray([features]))[0])
        # Convert grams to kilograms since InferenceResult defaults to unit="kg"
        prediction_kg = prediction / 1000.0
        elapsed = int((time.perf_counter() - started) * 1000)

        item = InferenceResult(
            filename=image_path.name,
            prediction_weight=prediction_kg,
            model="grape-weight-rf-v1",
            depth_used=str(depth_path) if depth_path else None,
            latency_ms=elapsed,
        )

        results.append(item.to_payload())

    return results
