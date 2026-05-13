"""Schema registry tests (M0-04)."""

from __future__ import annotations

import pytest

from spray.schemas import registry


def test_known_categories_includes_m0_03_events():
    cats = set(registry.known_categories())
    expected = {
        "vineyard.created",
        "vineyard.updated",
        "vineyard.archived",
        "block.created",
        "block.updated",
        "block.archived",
    }
    missing = expected - cats
    assert not missing, f"missing schema files for: {missing}"


def test_validate_accepts_well_formed_payload():
    registry.validate(
        category="vineyard.created",
        payload={
            "vineyard_id": "11111111-1111-1111-1111-111111111111",
            "name": "Klein Estate",
            "region": "napa",
        },
    )


def test_validate_rejects_missing_required_field():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.created",
            payload={"name": "anonymous"},  # missing vineyard_id
        )


def test_validate_rejects_unknown_category():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.exploded",
            payload={"vineyard_id": "11111111-1111-1111-1111-111111111111"},
        )


def test_validate_rejects_additional_properties():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.archived",
            payload={
                "vineyard_id": "11111111-1111-1111-1111-111111111111",
                "extra": "should be rejected",
            },
        )


def test_validate_rejects_unknown_version():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.created",
            payload={
                "vineyard_id": "11111111-1111-1111-1111-111111111111",
                "name": "X",
            },
            version=99,
        )


# =====================================================================
# PR-B (SA-2) schemas: RiskRecord, BlockVerdict, AdvisoryEvent, SensorReading
# =====================================================================


def test_known_categories_includes_pr_b_events():
    cats = set(registry.known_categories())
    expected = {
        "risk_record.emitted",
        "block_verdict.generated",
        "advisory_event.ingested",
        "sensor_reading.ingested",
    }
    missing = expected - cats
    assert not missing, f"missing schema files for: {missing}"


# ---------- RiskRecord ----------


def _risk_record_payload(**overrides):
    base = {
        "model_id": "gubler_thomas_2013",
        "model_version": "1.0.0",
        "block_id": "11111111-1111-1111-1111-111111111111",
        "valid_from": "2026-05-07T00:00:00Z",
        "valid_to": "2026-05-07T23:59:59Z",
        "pathogen": "powdery",
        "severity_1_10": 6.4,
        "raw_score": {"ri": 80},
        "thresholds_fired": [{"name": "RI>=60", "citation_id": "06-S2"}],
        "input_snapshot_id": "sha256:abc123",
        "confidence": 0.78,
        "citation_id": "06-S1",
    }
    base.update(overrides)
    return base


def test_risk_record_well_formed():
    registry.validate(category="risk_record.emitted", payload=_risk_record_payload())


def test_risk_record_rejects_severity_out_of_range():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="risk_record.emitted",
            payload=_risk_record_payload(severity_1_10=11.0),
        )


def test_risk_record_rejects_unknown_pathogen():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="risk_record.emitted",
            payload=_risk_record_payload(pathogen="botrytis"),
        )


# ---------- BlockVerdict ----------


def _seven_day_forecast():
    return [
        {
            "date": f"2026-05-{day:02d}",
            "powdery_severity_1_10": 5.0,
            "downy_severity_1_10": 3.0,
            "action": "hold",
        }
        for day in range(7, 14)
    ]


def _block_verdict_payload(**overrides):
    base = {
        "block_id": "11111111-1111-1111-1111-111111111111",
        "date": "2026-05-07",
        "powdery_severity_1_10": 6.5,
        "downy_severity_1_10": 4.2,
        "powdery_confidence": 0.74,
        "downy_confidence": 0.81,
        "action": "spray",
        "urgency": "24h",
        "drivers": [
            {
                "model": "gubler_thomas_2013",
                "value": 80.0,
                "threshold": 60.0,
                "citation_id": "06-S1",
                "weight": 0.35,
            }
        ],
        "split_summary": "3 of 4 powdery models agree (high).",
        "forecast_7d": _seven_day_forecast(),
        "advisory_events": [],
        "model_versions": {"gubler_thomas": "1.0.0"},
        "generated_at": "2026-05-07T03:00:00Z",
        "audit_hash": "sha256:" + ("a" * 64),
    }
    base.update(overrides)
    return base


def test_block_verdict_well_formed():
    registry.validate(
        category="block_verdict.generated", payload=_block_verdict_payload()
    )


def test_block_verdict_rejects_six_day_forecast():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="block_verdict.generated",
            payload=_block_verdict_payload(forecast_7d=_seven_day_forecast()[:6]),
        )


def test_block_verdict_rejects_bad_action():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="block_verdict.generated",
            payload=_block_verdict_payload(action="explode"),
        )


def test_block_verdict_rejects_audit_hash_format():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="block_verdict.generated",
            payload=_block_verdict_payload(audit_hash="md5:notthis"),
        )


# ---------- AdvisoryEvent ----------


def _advisory_event_payload(**overrides):
    base = {
        "advisory_id": "22222222-2222-2222-2222-222222222222",
        "source": "uc_ipm",
        "region": "US-CA",
        "issued_at": "2026-05-07T08:00:00Z",
        "valid_through": "2026-05-14T23:59:59Z",
        "hazard_type": "powdery",
        "severity": "high",
        "recommended_action": "Spray within 48 hours.",
        "raw_url": "https://ipm.ucanr.edu/example",
        "license": "public domain",
        "language": "en",
        "translated_text_en": None,
        "ingested_at": "2026-05-07T09:00:00Z",
    }
    base.update(overrides)
    return base


def test_advisory_event_well_formed():
    registry.validate(
        category="advisory_event.ingested", payload=_advisory_event_payload()
    )


def test_advisory_event_rejects_unknown_severity():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="advisory_event.ingested",
            payload=_advisory_event_payload(severity="apocalyptic"),
        )


def test_advisory_event_rejects_unknown_language():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="advisory_event.ingested",
            payload=_advisory_event_payload(language="de"),
        )


# ---------- SensorReading ----------


def _sensor_reading_payload(**overrides):
    base = {
        "block_id": "33333333-3333-3333-3333-333333333333",
        "ts": "2026-05-07T03:00:00Z",
        "leaf_wetness_min": 14.0,
        "air_temp_c": 18.2,
        "rh_pct": 88.0,
        "precip_mm": 0.0,
        "wind_speed_ms": 1.4,
        "source": "pessl",
        "device_id": "pessl-station-001",
        "quality_flag": "ok",
    }
    base.update(overrides)
    return base


def test_sensor_reading_well_formed():
    registry.validate(
        category="sensor_reading.ingested", payload=_sensor_reading_payload()
    )


def test_sensor_reading_allows_null_optional_fields():
    registry.validate(
        category="sensor_reading.ingested",
        payload=_sensor_reading_payload(
            leaf_wetness_min=None,
            air_temp_c=None,
            rh_pct=None,
            precip_mm=None,
            wind_speed_ms=None,
        ),
    )


def test_sensor_reading_rejects_unknown_source():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="sensor_reading.ingested",
            payload=_sensor_reading_payload(source="raspberry_pi_diy"),
        )


def test_sensor_reading_rejects_invalid_quality_flag():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="sensor_reading.ingested",
            payload=_sensor_reading_payload(quality_flag="probably_fine"),
        )


def test_sensor_reading_rejects_rh_over_100():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="sensor_reading.ingested",
            payload=_sensor_reading_payload(rh_pct=105.0),
        )
