import { requireAdmin } from "@/lib/admin/auth-check";
import { crmFetch } from "@/lib/admin/api";
import { Badge } from "@/components/admin/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { formatDate } from "@/lib/admin/crm";

type CrmProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

export default async function PeoplePage() {
  await requireAdmin();

  const profiles = (await crmFetch("/crm-profiles/")) as CrmProfile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team members with access to this CRM workspace. Roles and workspace
          membership are managed in the Django admin until invite UI lands.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
          <p className="text-sm font-medium">No team members yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in once with a Clerk admin account to populate this list.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Member since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.name?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {profile.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{profile.role}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
