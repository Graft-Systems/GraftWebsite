from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

from .data_io import ensure_output_dir, load_training_records, write_json
from .features import build_feature_vector
from .train import train_or_load_model


def run_eval_all(
    train_dir: Path,
    train_csv: Path,
    output_dir: Path,
    *,
    model_path: Path | None = None,
    random_state: int = 42,
    val_fraction: float = 0.2,
    use_raw_depth: bool = True,
) -> dict:
    """
    Train (or load) model, then score every RGB-D row from load_training_records.
    Writes summary.json and per_image_errors.csv under output_dir.
    """
    output_dir = ensure_output_dir(output_dir)
    model = train_or_load_model(
        train_dir=train_dir,
        train_csv=train_csv,
        output_dir=output_dir,
        model_path=model_path,
        random_state=random_state,
        val_fraction=val_fraction,
        use_raw_depth=use_raw_depth,
    )
    records = load_training_records(train_dir, labels_csv=train_csv)
    rows: list[dict] = []
    y_true: list[float] = []
    y_pred: list[float] = []

    for rgb_path, depth_path, weight, tabular in records:
        x = build_feature_vector(
            rgb_path,
            depth_path,
            tabular,
            use_raw_depth=use_raw_depth,
        )
        pred = float(model.predict(np.asarray([x]))[0])
        true = float(weight)
        ae = abs(pred - true)
        ape = (ae / true * 100.0) if true else float("nan")
        rows.append(
            {
                "image": rgb_path.name,
                "ground_truth_weight_kg": true,
                "prediction_weight_kg": pred,
                "absolute_error_kg": ae,
                "absolute_percentage_error": ape,
            }
        )
        y_true.append(true)
        y_pred.append(pred)

    y_t = np.asarray(y_true, dtype=np.float64)
    y_p = np.asarray(y_pred, dtype=np.float64)
    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    ape_arr = np.abs(y_p - y_t) / np.maximum(y_t, 1e-12) * 100.0
    mape = float(np.mean(ape_arr))
    summary = {
        "n_images": len(y_t),
        "mae_kg": mae,
        "rmse_kg": rmse,
        "mape_pct": mape,
        "mean_accuracy_pct": float(np.mean(100.0 - ape_arr)),
        "median_accuracy_pct": float(np.median(100.0 - ape_arr)),
        "note": (
            "In-sample metrics: model was fit on the full training set, then evaluated "
            "on the same images (optimistic). See train_metrics.json for validation split metrics."
        ),
    }
    write_json(output_dir / "summary.json", summary)
    pd.DataFrame(rows).sort_values("absolute_error_kg").to_csv(
        output_dir / "per_image_errors.csv",
        index=False,
    )
    return summary
