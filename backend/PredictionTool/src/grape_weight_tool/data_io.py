from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable

import math

import pandas as pd

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
RGB_CANDIDATES = ("rgb", "color", "image", "img")
DEPTH_CANDIDATES = ("depth", "disp", "distance")
IMAGE_COL_CANDIDATES = ("image", "image_name", "filename", "file", "img", "rgb")
WEIGHT_COL_CANDIDATES = ("weight", "weight_g", "mass", "cluster_weight", "target")


def ensure_output_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _normalize_key(path: Path) -> str:
    key = path.stem.lower()
    key = re.sub(r"(rgb|color|depth|disp|distance)", "", key)
    key = re.sub(r"[^a-z0-9]+", "", key)
    return key


def _looks_like_depth(path: Path) -> bool:
    token_space = f"{path.parent.name.lower()} {path.name.lower()}"
    return any(tag in token_space for tag in DEPTH_CANDIDATES)


def _looks_like_rgb(path: Path) -> bool:
    token_space = f"{path.parent.name.lower()} {path.name.lower()}"
    return any(tag in token_space for tag in RGB_CANDIDATES) or not _looks_like_depth(path)


def discover_rgb_depth_pairs(train_dir: Path) -> list[tuple[Path, Path]]:
    if not train_dir.exists():
        raise FileNotFoundError(f"Training directory not found: {train_dir}")

    image_files = [p for p in train_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]
    if not image_files:
        raise ValueError(f"No image files found under: {train_dir}")

    rgb_map: dict[str, Path] = {}
    depth_map: dict[str, Path] = {}
    for image_path in image_files:
        key = _normalize_key(image_path)
        if _looks_like_depth(image_path):
            depth_map.setdefault(key, image_path)
        elif _looks_like_rgb(image_path):
            rgb_map.setdefault(key, image_path)

    pairs: list[tuple[Path, Path]] = []
    for key, rgb_path in rgb_map.items():
        depth_path = depth_map.get(key)
        if depth_path:
            pairs.append((rgb_path, depth_path))

    if not pairs:
        raise ValueError(
            "No RGB-depth pairs detected. Ensure filenames/folders indicate RGB and depth images."
        )
    return sorted(pairs, key=lambda pair: pair[0].name.lower())


def _choose_column(columns: Iterable[str], candidates: tuple[str, ...]) -> str | None:
    lowered = {col.lower(): col for col in columns}
    for candidate in candidates:
        if candidate in lowered:
            return lowered[candidate]
    for col in columns:
        if any(candidate in col.lower() for candidate in candidates):
            return col
    return None


def load_first_csv(root_dir: Path) -> tuple[pd.DataFrame, Path]:
    csv_files = sorted(root_dir.rglob("*.csv"))
    if not csv_files:
        raise ValueError(f"No CSV files found under: {root_dir}")
    selected_csv = csv_files[0]
    return pd.read_csv(selected_csv), selected_csv


def load_csv_by_path(csv_path: Path) -> tuple[pd.DataFrame, Path]:
    if not csv_path.exists():
        raise FileNotFoundError(f"Training labels CSV not found: {csv_path}")
    if csv_path.suffix.lower() != ".csv":
        raise ValueError(f"Training labels file must be a CSV: {csv_path}")
    return pd.read_csv(csv_path), csv_path


def detect_tabular_columns(df: pd.DataFrame) -> dict[str, str | None]:
    cols = list(df.columns)
    height_col = next((c for c in cols if "height" in c.lower()), None)
    width_col = next((c for c in cols if "width" in c.lower()), None)
    distance_col = next((c for c in cols if "distance" in c.lower()), None)
    cluster_col = next((c for c in cols if "cluster" in c.lower()), None)
    return {
        "height_cm": height_col,
        "width_cm": width_col,
        "distance_cm": distance_col,
        "cluster_no": cluster_col,
    }


def _float_or_nan(value: Any) -> float:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return float("nan")
    try:
        if pd.isna(value):
            return float("nan")
    except TypeError:
        pass
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("nan")


def row_to_tabular(row: pd.Series, colmap: dict[str, str | None]) -> dict[str, float]:
    return {
        "height_cm": _float_or_nan(row[colmap["height_cm"]]) if colmap["height_cm"] else float("nan"),
        "width_cm": _float_or_nan(row[colmap["width_cm"]]) if colmap["width_cm"] else float("nan"),
        "distance_cm": _float_or_nan(row[colmap["distance_cm"]]) if colmap["distance_cm"] else float("nan"),
        "cluster_no": _float_or_nan(row[colmap["cluster_no"]]) if colmap["cluster_no"] else float("nan"),
    }


def resolve_label_schema(df: pd.DataFrame, source: Path) -> tuple[str, str]:
    image_col = _choose_column(df.columns, IMAGE_COL_CANDIDATES)
    weight_col = _choose_column(df.columns, WEIGHT_COL_CANDIDATES)
    if image_col and weight_col:
        return image_col, weight_col
    raise ValueError(
        "Could not resolve required CSV columns in "
        f"{source}. Needed image and weight columns. "
        f"Available columns: {list(df.columns)}. "
        "Use columns like image_name/file and weight/weight_g."
    )


def load_training_records(
    train_dir: Path,
    labels_csv: Path | None = None,
) -> list[tuple[Path, Path, float, dict[str, float]]]:
    pairs = discover_rgb_depth_pairs(train_dir)
    if labels_csv is None:
        labels_df, labels_csv = load_first_csv(train_dir)
    else:
        labels_df, labels_csv = load_csv_by_path(labels_csv)
    image_col, weight_col = resolve_label_schema(labels_df, labels_csv)
    colmap = detect_tabular_columns(labels_df)

    key_to_weight: dict[str, float] = {}
    key_to_tabular: dict[str, dict[str, float]] = {}
    for _, row in labels_df.iterrows():
        image_name = Path(str(row[image_col])).stem.lower()
        key_to_weight[image_name] = float(row[weight_col])
        key_to_tabular[image_name] = row_to_tabular(row, colmap)

    records: list[tuple[Path, Path, float, dict[str, float]]] = []
    for rgb_path, depth_path in pairs:
        candidates = {rgb_path.stem.lower(), _normalize_key(rgb_path)}
        match_weight = None
        tabular: dict[str, float] = {}
        for candidate in candidates:
            if candidate in key_to_weight:
                match_weight = key_to_weight[candidate]
                tabular = key_to_tabular.get(candidate, {})
                break
        if match_weight is not None:
            records.append((rgb_path, depth_path, match_weight, tabular))

    if not records:
        raise ValueError(
            "No training rows matched image pairs. Check filename alignment between image files "
            f"and label CSV {labels_csv.name}. CSV columns: {list(labels_df.columns)}"
        )
    return records


def lookup_ground_truth_weight(gt_csv: Path, test_image: Path) -> tuple[float, str]:
    if not gt_csv.exists():
        raise FileNotFoundError(f"Ground truth CSV not found: {gt_csv}")
    df = pd.read_csv(gt_csv)
    image_col, weight_col = resolve_label_schema(df, gt_csv)

    expected_names = {test_image.name.lower(), test_image.stem.lower()}
    for _, row in df.iterrows():
        candidate = str(row[image_col]).strip().lower()
        if candidate in expected_names or Path(candidate).stem.lower() == test_image.stem.lower():
            return float(row[weight_col]), str(row[image_col])

    raise ValueError(
        f"Could not find test image '{test_image.name}' in {gt_csv}. "
        f"Checked column '{image_col}'."
    )


def lookup_tabular_for_image(gt_csv: Path, test_image: Path) -> dict[str, float]:
    """Return tabular features for test image row, or NaN-filled dict if columns missing."""
    empty = {
        "height_cm": float("nan"),
        "width_cm": float("nan"),
        "distance_cm": float("nan"),
        "cluster_no": float("nan"),
    }
    if not gt_csv.exists():
        return empty
    df = pd.read_csv(gt_csv)
    image_col, _ = resolve_label_schema(df, gt_csv)
    colmap = detect_tabular_columns(df)
    if not any(colmap.values()):
        return empty

    expected_names = {test_image.name.lower(), test_image.stem.lower()}
    for _, row in df.iterrows():
        candidate = str(row[image_col]).strip().lower()
        if candidate in expected_names or Path(candidate).stem.lower() == test_image.stem.lower():
            return row_to_tabular(row, colmap)
    return empty

