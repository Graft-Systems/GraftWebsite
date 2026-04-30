from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _legacy_insert_predict_subcommand() -> None:
    """Allow `python tool.py --train-dir ...` without typing `predict`."""
    if len(sys.argv) > 1 and sys.argv[1] == "--train-dir":
        sys.argv.insert(1, "predict")


def _add_train_common(p: argparse.ArgumentParser, *, output_dir_default: str) -> None:
    p.add_argument(
        "--train-dir",
        required=True,
        help="Root directory for Dataset 4 RGB-D training data.",
    )
    p.add_argument(
        "--train-csv",
        default=None,
        help="Training labels CSV (required for eval-all; recommended for train dir with many CSVs).",
    )
    p.add_argument(
        "--output-dir",
        default=output_dir_default,
        help="Directory for outputs.",
    )
    p.add_argument(
        "--model-path",
        default=None,
        help="Optional existing model.joblib to skip training.",
    )
    p.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for reproducible training.",
    )
    p.add_argument(
        "--val-fraction",
        type=float,
        default=0.2,
        help="Fraction held out for validation metrics during training (0 disables).",
    )
    p.add_argument(
        "--use-raw-depth",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Prefer Z16 *_Depth.raw + metadata over PNG (default: true).",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Grape cluster weight: train, predict one image, or eval all matched Color images."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_pred = sub.add_parser(
        "predict",
        help="Train (or load model) and evaluate a single test image.",
    )
    _add_train_common(p_pred, output_dir_default="data/processed/run_latest")
    p_pred.add_argument(
        "--test-image",
        required=True,
        help="Path to one RGB test image (e.g. .../39b_Color.png).",
    )
    p_pred.add_argument(
        "--gt-csv",
        required=True,
        help="Ground-truth CSV with weight (and optional tabular columns) for comparison.",
    )

    p_all = sub.add_parser(
        "eval-all",
        help="Train (or load model), then score every matched RGB-D row; write summary + per-image CSV.",
    )
    _add_train_common(p_all, output_dir_default="data/processed/eval_all_color")

    return parser


def run_predict(args: argparse.Namespace) -> dict:
    from .data_io import ensure_output_dir
    from .evaluate import evaluate_single_image
    from .train import train_or_load_model

    output_dir = ensure_output_dir(Path(args.output_dir))
    model = train_or_load_model(
        train_dir=Path(args.train_dir),
        train_csv=Path(args.train_csv) if args.train_csv else None,
        output_dir=output_dir,
        model_path=Path(args.model_path) if args.model_path else None,
        random_state=args.random_state,
        val_fraction=args.val_fraction,
        use_raw_depth=args.use_raw_depth,
    )
    if not args.model_path:
        tm = output_dir / "train_metrics.json"
        if tm.exists():
            info = json.loads(tm.read_text(encoding="utf-8"))
            if info.get("n_val", 0):
                print(
                    "Validation:",
                    f"MAE={info.get('val_mae_kg', float('nan')):.4f} kg",
                    f"RMSE={info.get('val_rmse_kg', float('nan')):.4f} kg",
                    f"MAPE={info.get('val_mape_pct', float('nan')):.2f}%",
                )
    return evaluate_single_image(
        model=model,
        test_image=Path(args.test_image),
        gt_csv=Path(args.gt_csv),
        output_dir=output_dir,
        use_raw_depth=args.use_raw_depth,
    )


def run_eval_all_cmd(args: argparse.Namespace) -> dict:
    from .batch import run_eval_all

    if not args.train_csv:
        raise SystemExit("eval-all requires --train-csv (path to ground-truth labels CSV).")
    summary = run_eval_all(
        train_dir=Path(args.train_dir),
        train_csv=Path(args.train_csv),
        output_dir=Path(args.output_dir),
        model_path=Path(args.model_path) if args.model_path else None,
        random_state=args.random_state,
        val_fraction=args.val_fraction,
        use_raw_depth=args.use_raw_depth,
    )
    return summary


def main() -> None:
    _legacy_insert_predict_subcommand()
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "predict":
        metrics = run_predict(args)
        print("Prediction:", f"{metrics['prediction_weight']:.4f}")
        print("Ground truth:", f"{metrics['ground_truth_weight']:.4f}")
        print("Absolute error:", f"{metrics['absolute_error']:.4f}")
        print("Metrics saved to:", metrics["metrics_path"])
    elif args.command == "eval-all":
        summary = run_eval_all_cmd(args)
        print(json.dumps(summary, indent=2))
        print("Per-image CSV:", str(Path(args.output_dir) / "per_image_errors.csv"))
    else:
        parser.error(f"Unknown command: {args.command}")
