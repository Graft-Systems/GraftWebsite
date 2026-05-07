"""Ensemble fusion + audit-hash tests — M1.5 PR-C."""

from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from spray.aggregation.audit import ENSEMBLE_VERSION, compute_audit_hash
from spray.aggregation.ensemble import equal_weight_soft_vote
from spray.aggregation.runners.base import RiskRecordResult, ThresholdHit


def _result(
    *,
    model_id: str,
    pathogen: str,
    severity: float,
    confidence: float = 0.7,
    snapshot_id: str = "sha256:" + "a" * 64,
    citation_id: str = "06-S2",
):
    return RiskRecordResult(
        model_id=model_id,
        model_version="1.0.0",
        block_id="11111111-1111-1111-1111-111111111111",
        valid_from=datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        valid_to=datetime(2026, 5, 7, 23, 59, 59, tzinfo=timezone.utc),
        pathogen=pathogen,
        severity_1_10=severity,
        raw_score={},
        thresholds_fired=[ThresholdHit(name="t1", citation_id=citation_id)],
        input_snapshot_id=snapshot_id,
        confidence=confidence,
        citation_id=citation_id,
    )


# ---------------------------------------------------------------------
# Audit hash
# ---------------------------------------------------------------------


def test_audit_hash_format():
    h = compute_audit_hash(
        input_snapshot_id="sha256:" + "0" * 64,
        model_versions={"gubler_thomas_2013": "1.0.0"},
    )
    assert h.startswith("sha256:")
    assert len(h) == len("sha256:") + 64


def test_audit_hash_deterministic():
    h1 = compute_audit_hash(
        input_snapshot_id="snap1",
        model_versions={"a": "1.0.0", "b": "2.1.3"},
    )
    h2 = compute_audit_hash(
        input_snapshot_id="snap1",
        model_versions={"b": "2.1.3", "a": "1.0.0"},  # different insertion order
    )
    assert h1 == h2


def test_audit_hash_changes_when_input_changes():
    base = compute_audit_hash(
        input_snapshot_id="snap1",
        model_versions={"a": "1.0.0"},
    )
    diff_snapshot = compute_audit_hash(
        input_snapshot_id="snap2",
        model_versions={"a": "1.0.0"},
    )
    diff_version = compute_audit_hash(
        input_snapshot_id="snap1",
        model_versions={"a": "1.0.1"},
    )
    diff_ensemble = compute_audit_hash(
        input_snapshot_id="snap1",
        model_versions={"a": "1.0.0"},
        ensemble_version="some_other_version",
    )
    assert base != diff_snapshot
    assert base != diff_version
    assert base != diff_ensemble


# ---------------------------------------------------------------------
# Ensemble fusion
# ---------------------------------------------------------------------


def test_ensemble_high_powdery_triggers_spray():
    records = [
        _result(model_id="gubler_thomas_2013", pathogen="powdery", severity=8.5),
        _result(model_id="caffi_primary_2009", pathogen="downy", severity=2.0),
        _result(model_id="caffi_secondary_2010", pathogen="downy", severity=1.5),
    ]
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=records,
    )
    assert verdict["action"] == "spray"
    assert verdict["urgency"] in {"now", "24h"}
    assert verdict["powdery_severity_1_10"] == 8.5
    assert len(verdict["forecast_7d"]) == 7


def test_ensemble_moderate_triggers_scout():
    records = [
        _result(model_id="gubler_thomas_2013", pathogen="powdery", severity=5.0),
        _result(model_id="caffi_primary_2009", pathogen="downy", severity=4.5),
    ]
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=records,
    )
    assert verdict["action"] == "scout"


def test_ensemble_low_severity_holds():
    records = [
        _result(model_id="gubler_thomas_2013", pathogen="powdery", severity=2.0),
        _result(model_id="caffi_primary_2009", pathogen="downy", severity=1.5),
    ]
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=records,
    )
    assert verdict["action"] == "hold"
    assert verdict["urgency"] == "none"


def test_ensemble_split_summary_flags_disagreement():
    records = [
        _result(model_id="caffi_primary_2009", pathogen="downy", severity=8.0),
        _result(model_id="caffi_secondary_2010", pathogen="downy", severity=2.0),
    ]
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=records,
    )
    assert "split" in verdict["split_summary"].lower()


def test_ensemble_audit_hash_is_sha256_format():
    records = [
        _result(model_id="gubler_thomas_2013", pathogen="powdery", severity=5.0),
    ]
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=records,
    )
    assert verdict["audit_hash"].startswith("sha256:")
    assert len(verdict["audit_hash"]) == len("sha256:") + 64


def test_ensemble_no_records_still_emits_valid_verdict():
    verdict = equal_weight_soft_vote(
        block_id="11111111-1111-1111-1111-111111111111",
        target_date=date(2026, 5, 7),
        risk_records=[],
    )
    assert verdict["action"] == "hold"
    assert verdict["powdery_severity_1_10"] == 1.0
    assert verdict["downy_severity_1_10"] == 1.0
    assert len(verdict["forecast_7d"]) == 7
    assert verdict["audit_hash"].startswith("sha256:")
