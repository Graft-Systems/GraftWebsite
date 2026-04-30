from __future__ import annotations

from pathlib import Path

import numpy as np


def parse_depth_metadata_csv(metadata_path: Path) -> dict[str, str]:
    """Parse RealSense-style key,value metadata CSV (non-tabular layout)."""
    if not metadata_path.exists():
        raise FileNotFoundError(f"Depth metadata not found: {metadata_path}")
    out: dict[str, str] = {}
    for line in metadata_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or (line.endswith(":") and "," not in line):
            continue
        if "," not in line:
            continue
        key, _, value = line.partition(",")
        key = key.strip()
        value = value.strip()
        if key:
            out[key] = value
    return out


def load_z16_depth_array(raw_path: Path, width: int, height: int) -> np.ndarray | None:
    """Load Z16 depth as uint16 HxW array. Returns None if size mismatch."""
    expected = width * height * 2
    data = raw_path.read_bytes()
    if len(data) < expected:
        return None
    arr = np.frombuffer(data[:expected], dtype=np.uint16).copy().reshape((height, width))
    return arr


def depth_raw_stats(
    raw_path: Path,
    metadata_path: Path,
) -> list[float] | None:
    """Return mean, std, min, max, median of valid depth pixels, or None on failure."""
    try:
        if not raw_path.exists():
            return None
        meta = parse_depth_metadata_csv(metadata_path)
        if meta.get("Format", "").upper() != "Z16":
            return None
        w = int(float(meta.get("Resolution x", "0")))
        h = int(float(meta.get("Resolution y", "0")))
        bpp = int(float(meta.get("Bytes per pixel", "2")))
        if w <= 0 or h <= 0 or bpp != 2:
            return None
        arr = load_z16_depth_array(raw_path, w, h)
        if arr is None:
            return None
        flat = arr.astype(np.float64).ravel()
        valid = flat[flat > 0]
        if valid.size == 0:
            return [float("nan")] * 5
        return [
            float(np.mean(valid)),
            float(np.std(valid)),
            float(np.min(valid)),
            float(np.max(valid)),
            float(np.median(valid)),
        ]
    except (OSError, ValueError, TypeError):
        return None
