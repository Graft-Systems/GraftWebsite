"""Model runner registry — auto-discovers via decorator.

Adding a new model is a one-file change: drop a module under
`runners/`, decorate its class with `@register_runner`, and import the
module from `runners/__init__.py` (or trigger discovery via the eager
`get_all_runners()` import). The registry exposes lookups by slug and
by pathogen.
"""

from __future__ import annotations

from typing import Iterable, Type

from spray.aggregation.runners.base import ModelRunner, Pathogen


class UnknownRunnerError(KeyError):
    """Raised when a slug doesn't resolve to a registered runner."""


_REGISTRY: dict[str, Type[ModelRunner]] = {}


def register_runner(cls: Type[ModelRunner]) -> Type[ModelRunner]:
    slug = getattr(cls, "SLUG", None)
    if not slug:
        raise ValueError(f"runner {cls!r} missing SLUG class attribute")
    if not getattr(cls, "VERSION", None):
        raise ValueError(f"runner {cls!r} missing VERSION class attribute")
    if not getattr(cls, "PATHOGEN", None):
        raise ValueError(f"runner {cls!r} missing PATHOGEN class attribute")
    if not getattr(cls, "CITATION_ID", None):
        raise ValueError(f"runner {cls!r} missing CITATION_ID class attribute")
    _REGISTRY[slug] = cls
    return cls


def get_runner(slug: str) -> ModelRunner:
    cls = _REGISTRY.get(slug)
    if cls is None:
        raise UnknownRunnerError(
            f"no model runner registered for {slug!r}; "
            f"known: {sorted(_REGISTRY)}"
        )
    return cls()


def get_runners_for_pathogen(pathogen: Pathogen) -> list[ModelRunner]:
    return [
        cls()
        for cls in _REGISTRY.values()
        if cls.PATHOGEN == pathogen
    ]


def known_slugs() -> list[str]:
    return sorted(_REGISTRY)


def all_runner_versions() -> dict[str, str]:
    """Returns `{slug: version}` for audit hashing."""
    return {slug: cls.VERSION for slug, cls in sorted(_REGISTRY.items())}


# Eager imports — adapters self-register on package import.
# Imports MUST live at module bottom to avoid circular imports
# (each runner imports from registry to call register_runner).
from spray.aggregation.runners import (  # noqa: E402, F401
    caffi_primary,
    caffi_secondary,
    gubler_thomas,
)
