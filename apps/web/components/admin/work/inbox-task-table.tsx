import Link from "next/link";

import { completeTaskAction, reassignTaskAction } from "@/app/admin/actions/work";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { formatDate } from "@/lib/admin/crm";
import { cn } from "@/lib/admin/utils";

type InboxTaskTableProps = {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    company: { id: string; name: string };
    contact: { id: string; name: string } | null;
    owner: { id: string; name: string | null; email: string } | null;
  }>;
  teammates: Array<{ id: string; name: string | null; email: string }>;
};

const ownerSelectClassName = cn(
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
);

export function InboxTaskTable({ tasks, teammates }: InboxTaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No follow-ups in this view.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create tasks from a company page or switch views.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <p className="font-medium">{task.title}</p>
                {task.contact ? (
                  <p className="text-xs text-muted-foreground">{task.contact.name}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Link href={`/admin/companies/${task.company.id}`} className="hover:underline">
                  {task.company.name}
                </Link>
              </TableCell>
              <TableCell>
                <form action={reassignTaskAction.bind(null, task.id)} className="flex items-center gap-2">
                  <select
                    name="ownerId"
                    defaultValue={task.owner?.id ?? ""}
                    aria-label="Reassign owner"
                    className={ownerSelectClassName}
                  >
                    <option value="">Unassigned</option>
                    {teammates.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name ?? user.email}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    Save
                  </Button>
                </form>
              </TableCell>
              <TableCell>{formatDate(task.dueAt)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{task.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {task.status === "open" ? (
                  <form action={completeTaskAction.bind(null, task.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      Done
                    </Button>
                  </form>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
