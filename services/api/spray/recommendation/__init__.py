"""Recommendation surface — daily brief renderer + citation lookup.

Per spec §13B. M1.5 PR-F ships:
  - `daily_brief.py`: deterministic Jinja-style brief generator
  - `citations.py`: sources_master.csv lookup keyed by citation_id

LLM-authored brief + P-Cite verifier deferred to PR-F.5 alongside a
hand-curated 50-row golden test set.
"""
