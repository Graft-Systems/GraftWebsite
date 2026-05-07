"""Pessl Instruments FieldClimate connector (M1.5 PR-D, spec §12A.1).

Partner-app OAuth 2.0 flow; 15-min polling for Tier-2+ users (auto-degrades
to hourly on 429). Leaf-wetness reported in MINUTES (model-ready, no
conversion).
"""
