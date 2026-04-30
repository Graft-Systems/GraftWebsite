from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .data_io import load_training_records, write_json
from .features import build_feature_vector


def _mape_pct(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def _train_model(
    train_dir: Path,
    random_state: int,
    train_csv: Path | None = None,
    val_fraction: float = 0.2,
    use_raw_depth: bool = True,
) -> tuple[Pipeline, dict]:
    records = load_training_records(train_dir, labels_csv=train_csv)
    x_rows: list[np.ndarray] = []
    y_vals: list[float] = []
    for rgb_path, depth_path, weight, tabular in records:
        x_rows.append(
            build_feature_vector(
                rgb_path,
                depth_path,
                tabular,
                use_raw_depth=use_raw_depth,
            )
        )
        y_vals.append(float(weight))

    x_all = np.vstack(x_rows)
    y_all = np.asarray(y_vals, dtype=np.float32)

    metadata: dict = {
        "total_samples": int(len(y_all)),
        "val_fraction": float(val_fraction),
        "use_raw_depth": bool(use_raw_depth),
    }

    if val_fraction > 0 and len(y_all) >= 2:
        x_tr, x_va, y_tr, y_va = train_test_split(
            x_all,
            y_all,
            test_size=val_fraction,
            random_state=random_state,
        )
        split_model = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "regressor",
                    RandomForestRegressor(
                        n_estimators=200,
                        random_state=random_state,
                        n_jobs=-1,
                    ),
                ),
            ]
        )
        split_model.fit(x_tr, y_tr)
        val_pred = split_model.predict(x_va)
        metadata["n_train_split"] = int(len(y_tr))
        metadata["n_val"] = int(len(y_va))
        metadata["val_mae_kg"] = float(mean_absolute_error(y_va, val_pred))
        metadata["val_rmse_kg"] = float(np.sqrt(mean_squared_error(y_va, val_pred)))
        metadata["val_mape_pct"] = _mape_pct(y_va, val_pred)
        metadata["train_split_mae_kg"] = float(
            mean_absolute_error(y_tr, split_model.predict(x_tr))
        )
    else:
        metadata["n_train_split"] = int(len(y_all))
        metadata["n_val"] = 0
        metadata["val_mae_kg"] = float("nan")
        metadata["val_rmse_kg"] = float("nan")
        metadata["val_mape_pct"] = float("nan")
        metadata["train_split_mae_kg"] = float("nan")

    model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=random_state,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(x_all, y_all)
    train_preds = model.predict(x_all)
    metadata["train_mae_kg"] = float(mean_absolute_error(y_all, train_preds))
    metadata["train_samples"] = int(len(y_all))

    return model, metadata


def train_or_load_model(
    train_dir: Path,
    train_csv: Path | None,
    output_dir: Path,
    model_path: Path | None = None,
    random_state: int = 42,
    val_fraction: float = 0.2,
    use_raw_depth: bool = True,
) -> Pipeline:
    if model_path:
        if not model_path.exists():
            raise FileNotFoundError(f"Provided --model-path does not exist: {model_path}")
        return joblib.load(model_path)

    model, metadata = _train_model(
        train_dir,
        random_state=random_state,
        train_csv=train_csv,
        val_fraction=val_fraction,
        use_raw_depth=use_raw_depth,
    )
    out_model_path = output_dir / "model.joblib"
    out_train_info = output_dir / "train_metrics.json"
    joblib.dump(model, out_model_path)
    write_json(
        out_train_info,
        {
            "model_path": str(out_model_path),
            **metadata,
        },
    )
    return model
