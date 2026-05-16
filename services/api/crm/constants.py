"""Shared CRM constants."""

import uuid

# Stable dev workspace id (replaces Prisma's string "seed-workspace").
SEED_WORKSPACE_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
SEED_WORKSPACE_ID_STR = str(SEED_WORKSPACE_ID)

DEFAULT_RELATIONSHIP_STAGES = [
    ("met", "Met", 0),
    ("exploring", "Exploring", 1),
    ("active_conversation", "Active conversation", 2),
    ("pilot", "Pilot", 3),
    ("customer", "Customer", 4),
    ("partner", "Partner", 5),
    ("investor", "Investor", 6),
    ("dormant", "Dormant", 7),
]
