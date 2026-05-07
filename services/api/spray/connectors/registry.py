"""Vendor-slug → SensorConnector registry (M1.5 PR-D step 3).

Mirrors `spray.providers.registry`. PR-D ships only Pessl; PR-E adds
Davis + METER.
"""

from __future__ import annotations

from typing import Callable

from spray.connectors.base import SensorConnector


_REGISTRY: dict[str, SensorConnector] = {}


def register(slug: str) -> Callable[[type[SensorConnector]], type[SensorConnector]]:
    """Decorator: `@register("pessl")` on a SensorConnector class."""

    def decorator(cls: type[SensorConnector]) -> type[SensorConnector]:
        _REGISTRY[slug] = cls()
        return cls

    return decorator


def get_connector(slug: str) -> SensorConnector:
    """Resolve a vendor slug to its connector singleton."""
    if slug not in _REGISTRY:
        # Eager-import known vendors so a fresh import path still resolves.
        _eager_import_known()
    if slug not in _REGISTRY:
        raise KeyError(f"no SensorConnector registered for slug={slug!r}")
    return _REGISTRY[slug]


def known_slugs() -> list[str]:
    if not _REGISTRY:
        _eager_import_known()
    return sorted(_REGISTRY.keys())


def _eager_import_known() -> None:
    """Force-import vendor modules so their @register decorators fire."""
    try:
        import spray.connectors.sensors.pessl.connector  # noqa: F401
    except ImportError:
        pass
