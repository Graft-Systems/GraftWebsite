import Link from "next/link";

import { InboxTaskTable } from "@/components/admin/work/inbox-task-table";
import { buttonVariants } from "@/components/admin/ui/button";
import { listWorkspaceUsers } from "@/lib/admin/companies/queries";
import { INBOX_VIEWS, type InboxView } from "@/lib/admin/constants";
import { getInboxCounts, listInboxTasks } from "@/lib/admin/work/queries";
import { requireAdmin } from "@/lib/admin/auth-check";
import { cn } from "@/lib/admin/utils";

type InboxPageProps = {
  searchParams: Promise<{ view?: string }>;
};

const viewLabels: Record<InboxView, string> = {
  my: "My tasks",
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  unassigned: "Unassigned",
};

function parseView(value?: string): InboxView {
  if (value && INBOX_VIEWS.includes(value as InboxView)) {
    return value as InboxView;
  }

  return "my";
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { userId } = await requireAdmin();
  const params = await searchParams;
  const view = parseView(params.view);
  const [tasks, counts, teammates] = await Promise.all([
    listInboxTasks("00000000-0000-4000-8000-000000000001", view, userId),
    getInboxCounts("00000000-0000-4000-8000-000000000001", userId),
    listWorkspaceUsers("00000000-0000-4000-8000-000000000001"),
  ]);

  const countByView: Record<InboxView, number> = {
    my: counts.my,
    overdue: counts.overdue,
    today: counts.today,
    week: counts.week,
    unassigned: counts.unassigned,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Follow-up inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work through open follow-ups by owner, due date, and assignment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INBOX_VIEWS.map((item) => (
          <Link
            key={item}
            href={`/admin/inbox?view=${item}`}
            className={cn(
              buttonVariants({ variant: item === view ? "default" : "outline", size: "sm" }),
            )}
          >
            {viewLabels[item]} ({countByView[item]})
          </Link>
        ))}
      </div>

      <InboxTaskTable
        tasks={tasks}
        teammates={teammates.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
        }))}
      />
    </div>
  );
}
