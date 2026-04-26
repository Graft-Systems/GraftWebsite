from __future__ import annotations

import json
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
    if not train_dir.exists():
        raise FileNotFoundError(
            f"PREDICTION_TRAIN_DIR does not exist: {train_dir}. "
            "Set it in backend .env."
        )

    train_csv = Path(settings.PREDICTION_TRAIN_CSV) if settings.PREDICTION_TRAIN_CSV else None
    model_path = (
        Path(settings.PREDICTION_MODEL_PATH) if settings.PREDICTION_MODEL_PATH else None
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


def run_prediction_for_images(image_paths: list[Path]) -> list[dict[str, Any]]:
    model, build_feature_vector = _get_cached_prediction_runtime()
    output_dir = Path(settings.PREDICTION_RUNS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

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
        elapsed = int((time.perf_counter() - started) * 1000)

        item = InferenceResult(
            filename=image_path.name,
            prediction_weight=prediction,
            model="grape-weight-rf-v1",
            depth_used=str(depth_path) if depth_path else None,
            latency_ms=elapsed,
        )

        results.append(item.to_payload())

    metrics_path = output_dir / "latest_api_metrics.json"
    metrics_path.write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
    return results
