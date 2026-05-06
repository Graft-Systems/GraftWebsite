"""M0-03 step 8: Row-level security policies on tenant-scoped tables.

Enables RLS on Membership / Vineyard / Block / DataLakeEvent. Each policy
filters by the `app.current_org_id` session GUC set by
`spray.middleware.CurrentOrgMiddleware`.

A user with no org context resolves the GUC to empty string, which fails
every policy's UUID equality check, so they see zero rows. This is the
desired default-deny.

The Postgres role that runs migrations needs BYPASSRLS (the owner role
typically has it; on Render Postgres Pro the default user owns its
database so this is fine). Runtime application connections are the same
role today (managed Postgres limitation); RLS is enforced via FORCE ROW
LEVEL SECURITY which applies even to the table owner.

To roll back: the reverse SQL drops every policy and disables RLS,
returning behavior to pre-RLS state.
"""

from __future__ import annotations

from django.db import migrations


# A common pattern: USING clause filters reads, WITH CHECK clause filters
# writes (insert/update target row must match policy). For Membership /
# Vineyard / DataLakeEvent the org_id is on the row directly. For Block,
# we traverse via vineyard.
POLICIES_FORWARD_SQL = """
ALTER TABLE spray_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_membership FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_org_isolation ON spray_membership;
CREATE POLICY membership_org_isolation ON spray_membership
    USING (org_id::text = current_setting('app.current_org_id', true))
    WITH CHECK (org_id::text = current_setting('app.current_org_id', true));

ALTER TABLE spray_vineyard ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_vineyard FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vineyard_org_isolation ON spray_vineyard;
CREATE POLICY vineyard_org_isolation ON spray_vineyard
    USING (org_id::text = current_setting('app.current_org_id', true))
    WITH CHECK (org_id::text = current_setting('app.current_org_id', true));

ALTER TABLE spray_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_block FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_org_isolation ON spray_block;
CREATE POLICY block_org_isolation ON spray_block
    USING (
        (SELECT v.org_id FROM spray_vineyard v WHERE v.id = vineyard_id)::text
        = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        (SELECT v.org_id FROM spray_vineyard v WHERE v.id = vineyard_id)::text
        = current_setting('app.current_org_id', true)
    );

ALTER TABLE spray_datalakeevent ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_datalakeevent FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS datalakeevent_org_isolation ON spray_datalakeevent;
CREATE POLICY datalakeevent_org_isolation ON spray_datalakeevent
    USING (
        org_id IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
    )
    WITH CHECK (
        org_id IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
    );
"""

POLICIES_REVERSE_SQL = """
DROP POLICY IF EXISTS datalakeevent_org_isolation ON spray_datalakeevent;
ALTER TABLE spray_datalakeevent NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_datalakeevent DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS block_org_isolation ON spray_block;
ALTER TABLE spray_block NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_block DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vineyard_org_isolation ON spray_vineyard;
ALTER TABLE spray_vineyard NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_vineyard DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_org_isolation ON spray_membership;
ALTER TABLE spray_membership NO FORCE ROW LEVEL SECURITY;
ALTER TABLE spray_membership DISABLE ROW LEVEL SECURITY;
"""


def _apply_rls_forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(POLICIES_FORWARD_SQL)


def _apply_rls_reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(POLICIES_REVERSE_SQL)


class Migration(migrations.Migration):
    dependencies = [
        ("spray", "0002_postgis_vineyard_block_datalake"),
    ]

    operations = [
        migrations.RunPython(_apply_rls_forward, _apply_rls_reverse),
    ]
