"""Model runner subpackages.

Each subpackage contains exactly one runner that implements the
`ModelRunner` Protocol from `base.py` and self-registers via
`@register_runner` in `registry.py`.
"""

from spray.aggregation.runners import registry  # noqa: F401
