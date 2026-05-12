"""Seed a pilot-ready Graft Spray demo vineyard."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point, Polygon
from django.core.management.base import BaseCommand
from django.utils import timezone as django_timezone

from spray.models import (
    Block,
    BlockVerdict,
    IntegrationConnection,
    Membership,
    Org,
    SensorReading,
    SensorStation,
    SensorStationBlock,
    User,
    Vineyard,
    WeatherObservation,
    WeatherStation,
)


class Command(BaseCommand):
    help = "Seed an idempotent Napa/Sonoma demo vineyard with sensor mappings and verdicts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-name",
            default="Graft Demo Vineyard",
            help="Org name to create or update.",
        )
        parser.add_argument(
            "--owner-email",
            default="",
            help="Optional existing user email to add as OWNER of the demo org.",
        )

    def handle(self, *args, **options):
        org_name = options["org_name"]
        org, _ = Org.objects.update_or_create(
            name=org_name,
            defaults={
                "region": Org.Region.NAPA,
                "settings": {"demo": True, "pilot_ready": True},
            },
        )
        owner_email = options.get("owner_email") or ""
        if owner_email:
            _attach_owner(self, org, owner_email)

        vineyard, _ = Vineyard.objects.update_or_create(
            org=org,
            name="Demo Estate",
            defaults={
                "region": Org.Region.NAPA,
                "address": "Napa Valley, CA",
                "centroid": Point(-122.365, 38.428, srid=4326),
                "settings": {"demo": True},
            },
        )
        blocks = {
            "North Ridge": _block(
                vineyard,
                "North Ridge",
                -122.370,
                38.431,
                "Cabernet Sauvignon",
            ),
            "Creek Flat": _block(
                vineyard,
                "Creek Flat",
                -122.363,
                38.424,
                "Merlot",
            ),
            "Home Chardonnay": _block(
                vineyard,
                "Home Chardonnay",
                -122.358,
                38.429,
                "Chardonnay",
            ),
        }

        connection, _ = IntegrationConnection.objects.update_or_create(
            org=org,
            vendor=IntegrationConnection.Vendor.DAVIS,
            vendor_account_id="demo-davis-account",
            defaults={
                "token_ciphertext": b"demo-token-not-real",
                "status": IntegrationConnection.Status.ACTIVE,
                "last_health_at": django_timezone.now(),
                "last_health_detail": "Demo connection healthy",
            },
        )
        station, _ = SensorStation.objects.update_or_create(
            connection=connection,
            vendor_station_id="demo-north-station",
            defaults={
                "name": "Demo North Weather Station",
                "lat": Decimal("38.431000"),
                "lon": Decimal("-122.370000"),
                "last_seen_at": django_timezone.now(),
            },
        )
        for block in blocks.values():
            SensorStationBlock.objects.get_or_create(station=station, block=block)

        weather_station, _ = WeatherStation.objects.update_or_create(
            provider="visual_crossing",
            station_id="demo-napa-grid",
            defaults={
                "org": org,
                "name": "Demo Napa Grid Forecast",
                "location": Point(-122.365, 38.428, srid=4326),
                "region": Org.Region.NAPA,
                "is_regional_default": False,
                "last_pull_at": django_timezone.now(),
                "settings": {"demo": True},
            },
        )

        now = django_timezone.now().replace(minute=0, second=0, microsecond=0)
        _seed_sensor_readings(station, now)
        _seed_weather(weather_station, now)
        _seed_verdicts(blocks, now.date())

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo org '{org.name}' with {len(blocks)} blocks and verdicts."
            )
        )


def _attach_owner(command: BaseCommand, org: Org, owner_email: str) -> None:
    try:
        user = User.objects.get(email=owner_email)
    except User.DoesNotExist:
        command.stdout.write(
            command.style.WARNING(
                f"No existing Spray user found for {owner_email}; "
                "demo org was seeded without a membership."
            )
        )
        return

    Membership.objects.update_or_create(
        org=org,
        user=user,
        defaults={"role": Membership.Role.OWNER},
    )


def _block(vineyard, name: str, lon: float, lat: float, variety: str) -> Block:
    size = 0.004
    polygon = Polygon(
        (
            (lon - size, lat - size),
            (lon - size, lat + size),
            (lon + size, lat + size),
            (lon + size, lat - size),
            (lon - size, lat - size),
        ),
        srid=4326,
    )
    block, _ = Block.objects.update_or_create(
        vineyard=vineyard,
        name=name,
        defaults={
            "geom": polygon,
            "variety": variety,
            "training_system": "VSP",
            "row_spacing_m": Decimal("2.40"),
            "settings": {"demo": True},
        },
    )
    return block


def _seed_sensor_readings(station: SensorStation, now: datetime) -> None:
    for offset in range(24):
        ts = now - timedelta(hours=23 - offset)
        warm = offset in range(10, 20)
        SensorReading.objects.update_or_create(
            station=station,
            ts=ts,
            defaults={
                "air_temp_c": Decimal("24.5") if warm else Decimal("16.8"),
                "rh_pct": Decimal("82.0") if warm else Decimal("91.0"),
                "leaf_wetness_min": Decimal("42.0") if warm else Decimal("18.0"),
                "precip_mm": Decimal("0.20") if offset in (5, 6) else Decimal("0.00"),
                "wind_speed_ms": Decimal("2.30"),
                "quality_flag": SensorReading.QualityFlag.OK,
            },
        )


def _seed_weather(station: WeatherStation, now: datetime) -> None:
    for offset in range(72):
        ts = now + timedelta(hours=offset)
        WeatherObservation.objects.update_or_create(
            station=station,
            ts=ts,
            defaults={
                "temp_c": Decimal("22.0") if offset < 36 else Decimal("18.5"),
                "rh_pct": Decimal("76.0"),
                "leaf_wetness_min": Decimal("20.0"),
                "wind_speed_ms": Decimal("2.80"),
                "precip_mm": Decimal("0.00"),
                "is_forecast": True,
                "raw": {"demo": True},
            },
        )


def _seed_verdicts(blocks: dict[str, Block], target_date: date) -> None:
    rows = [
        ("North Ridge", Decimal("8.40"), Decimal("2.10"), "spray", "24h"),
        ("Creek Flat", Decimal("5.30"), Decimal("4.20"), "scout", "72h"),
        ("Home Chardonnay", Decimal("2.20"), Decimal("1.80"), "hold", "none"),
    ]
    for name, powdery, downy, action, urgency in rows:
        BlockVerdict.objects.update_or_create(
            block=blocks[name],
            date=target_date,
            defaults={
                "powdery_severity_1_10": powdery,
                "downy_severity_1_10": downy,
                "powdery_confidence": Decimal("0.8400"),
                "downy_confidence": Decimal("0.7100"),
                "action": action,
                "urgency": urgency,
                "drivers": [
                    {
                        "model": "gubler_thomas_2013",
                        "value": float(powdery),
                        "threshold": 7.0,
                        "citation_id": "06-S2",
                        "weight": 0.5,
                    }
                ],
                "split_summary": "Demo seeded verdict from fused vineyard sensor and weather evidence.",
                "forecast_7d": [
                    {
                        "date": (target_date + timedelta(days=offset)).isoformat(),
                        "powdery_severity_1_10": float(max(Decimal("1.0"), powdery - Decimal(offset) * Decimal("0.3"))),
                        "downy_severity_1_10": float(max(Decimal("1.0"), downy - Decimal(offset) * Decimal("0.2"))),
                        "action": action if offset <= 2 else "hold",
                    }
                    for offset in range(1, 8)
                ],
                "advisory_events": [],
                "model_versions": {"gubler_thomas_2013": "1.0.0-demo"},
                "generated_at": django_timezone.now(),
                "audit_hash": "sha256:" + ("d" * 64),
            },
        )
