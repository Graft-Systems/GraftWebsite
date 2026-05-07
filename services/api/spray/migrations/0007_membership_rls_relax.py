"""Drop the org-isolation RLS policy on Membership.

The original M0-03 policy filtered Membership rows by
`org_id = current_setting('app.current_org_id')`. That was the right
default for org-scoped views (`GET /orgs/<id>/memberships`) but
fundamentally incompatible with the user-scoped `GET /orgs/me` call
that lists every Org the caller belongs to: the GUC is empty, the
policy denies everything, and the user can never discover their own
memberships.

Resolution: drop RLS on Membership entirely. Application-layer
filtering by `Membership.objects.filter(user=request.user)` is the
gate; cross-org leak protection sits on the caller's permission class
(`IsOrgMember`, `IsOrgOwner`, etc.) which checks Membership in the
target Org before letting the request through.

Tenant-scoped tables (Vineyard, Block, DataLakeEvent) keep their RLS
policies intact — those are the high-volume rows where DB-level
filtering matters most.

Caught when Benson's first vineyard create call returned an empty
memberships list, blocking the M1-09 smoke test.
"""

from __future__ import annotations

from django.db import migrations


FORWARD_SQL = """
DROP POLICY IF EXISTS membership_org_isolation ON spray_membership;
ALTER TABLE spray_membership NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_membership DISABLE ROW LEVEL SECURITY;
"""


REVERSE_SQL = """
ALTER TABLE spray_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_membership FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_org_isolation ON spray_membership
    USING (org_id::text = current_setting('app.current_org_id', true))
    WITH CHECK (org_id::text = current_setting('app.current_org_id', true));
"""


def _forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(FORWARD_SQL)


def _reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(REVERSE_SQL)


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0006_capture"),
    ]

    operations = [
        migrations.RunPython(_forward, _reverse),
    ]
