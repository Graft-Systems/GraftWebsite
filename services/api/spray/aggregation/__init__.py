"""Graft Spray aggregation engine (M1.5 PR-C, SA-2).

Spec §11A. Mechanistic model runners emit `RiskRecord`s; the ensemble
layer fuses them into a `BlockVerdict` per block per day.

Year 0: equal-weight soft vote.
Year 1: weighted average tuned on labelled outcomes (Brier).
Year 2+: stacked meta-learner with conformal prediction intervals.

Layout:
  runners/             one subpackage per mechanistic model
  ensemble.py          Year-0 fusion + future stacked variants
  severity_anchors.py  RI / SEV banding to 1-10
  audit.py             reproducible audit_hash for tamper evidence
"""

from spray.aggregation.runners import registry  # noqa: F401
from spray.aggregation.audit import compute_audit_hash  # noqa: F401
from spray.aggregation.ensemble import equal_weight_soft_vote  # noqa: F401
