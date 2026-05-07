"""Sensor connector namespace (M1.5 PR-D, spec §12A.6).

Connectors are vendor APIs the customer authenticates against (Pessl,
Davis, METER, Sencrop). Distinct from `spray.providers/`, which holds
read-only feeds we own the auth on (Visual Crossing, UC IPM, uspest).

Per CODEBASE_PLAN.md §300 the two namespaces coexist intentionally.
"""
