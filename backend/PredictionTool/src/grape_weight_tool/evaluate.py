from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import numpy as np

from .data_io import lookup_ground_truth_weight, lookup_tabular_for_image, write_json
from .features import build_feature_vector


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


def evaluate_single_image(
    model: Any,
    test_image: Path,
    gt_csv: Path,
    output_dir: Path,
    *,
    use_raw_depth: bool = True,
) -> dict:
    if not test_image.exists():
        raise FileNotFoundError(f"Test image not found: {test_image}")

    depth_path = _try_find_depth_pair(test_image)
    if depth_path is None:
        # Model still works because training pipeline includes median imputation.
        pass

    tabular = lookup_tabular_for_image(gt_csv, test_image)
    features = build_feature_vector(
        test_image,
        depth_path,
        tabular,
        use_raw_depth=use_raw_depth,
    )
    prediction = float(model.predict(np.asarray([features]))[0])
    gt_weight, matched_key = lookup_ground_truth_weight(gt_csv, test_image)
    abs_error = abs(prediction - gt_weight)

    metrics = {
        "test_image": str(test_image),
        "matched_ground_truth_key": matched_key,
        "prediction_weight": prediction,
        "ground_truth_weight": gt_weight,
        "absolute_error": abs_error,
        "depth_used": str(depth_path) if depth_path else None,
    }
    metrics_path = output_dir / "metrics.json"
    summary_path = output_dir / "summary.txt"
    write_json(metrics_path, metrics)
    summary_path.write_text(
        "\n".join(
            [
                f"test_image: {test_image}",
                f"matched_ground_truth_key: {matched_key}",
                f"prediction_weight: {prediction:.6f}",
                f"ground_truth_weight: {gt_weight:.6f}",
                f"absolute_error: {abs_error:.6f}",
            ]
        ),
        encoding="utf-8",
    )
    metrics["metrics_path"] = str(metrics_path)
    metrics["summary_path"] = str(summary_path)
    return metrics

