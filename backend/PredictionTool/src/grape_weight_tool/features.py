from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from PIL import UnidentifiedImageError

from .depth_raw import depth_raw_stats


def _channel_stats(arr: np.ndarray) -> list[float]:
    return [
        float(np.mean(arr)),
        float(np.std(arr)),
        float(np.min(arr)),
        float(np.max(arr)),
        float(np.median(arr)),
    ]


def extract_rgb_features(rgb_path: Path) -> list[float]:
    image = Image.open(rgb_path).convert("RGB")
    arr = np.asarray(image, dtype=np.float32)
    features: list[float] = []
    for channel in range(3):
        features.extend(_channel_stats(arr[:, :, channel]))
    height, width = arr.shape[0], arr.shape[1]
    features.extend(
        [
            float(height),
            float(width),
            float(width / height if height else 0.0),
        ]
    )
    return features


def extract_depth_features_png(depth_path: Path | None) -> list[float]:
    if depth_path is None:
        return [float("nan")] * 5
    try:
        image = Image.open(depth_path).convert("L")
        arr = np.asarray(image, dtype=np.float32)
        return _channel_stats(arr)
    except (UnidentifiedImageError, OSError, ValueError):
        return [float("nan")] * 5


def extract_depth_features(
    depth_png_path: Path | None,
    *,
    use_raw_depth: bool = True,
) -> list[float]:
    if depth_png_path is None:
        return [float("nan")] * 5
    if use_raw_depth:
        raw_path = depth_png_path.with_suffix(".raw")
        meta_path = depth_png_path.parent / f"{depth_png_path.stem}_metadata.csv"
        raw_stats = depth_raw_stats(raw_path, meta_path)
        if raw_stats is not None:
            return raw_stats
    return extract_depth_features_png(depth_png_path)


def tabular_to_vector(tabular: dict[str, float] | None) -> list[float]:
    if not tabular:
        return [float("nan")] * 4
    return [
        float(tabular.get("height_cm", float("nan"))),
        float(tabular.get("width_cm", float("nan"))),
        float(tabular.get("distance_cm", float("nan"))),
        float(tabular.get("cluster_no", float("nan"))),
    ]


def build_feature_vector(
    rgb_path: Path,
    depth_png_path: Path | None,
    tabular: dict[str, float] | None = None,
    *,
    use_raw_depth: bool = True,
) -> np.ndarray:
    rgb = extract_rgb_features(rgb_path)
    depth = extract_depth_features(depth_png_path, use_raw_depth=use_raw_depth)
    tab = tabular_to_vector(tabular)
    return np.asarray(rgb + depth + tab, dtype=np.float32)
