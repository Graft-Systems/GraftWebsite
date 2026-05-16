import {
  completeTaskAction,
  createTaskAction,
  updateTaskAction,
} from "@/app/admin/actions/work";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { TASK_STATUSES } from "@/lib/admin/constants";
import { formatDate } from "@/lib/admin/crm";
import { cn } from "@/lib/admin/utils";

type TaskSectionProps = {
  companyId: string;
  contacts: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  deals: Array<{ id: string; name: string }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: Date | null;
    owner: { id: string; name: string | null; email: string } | null;
    contact: { id: string; name: string } | null;
    deal: { id: string; name: string } | null;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "done") {
    return "secondary";
  }

  if (status === "cancelled") {
    return "outline";
  }

  return "default";
}

export function TaskSection({ companyId, contacts, users, deals, tasks }: TaskSectionProps) {
  const defaultDueAt = new Date();
  defaultDueAt.setDate(defaultDueAt.getDate() + 3);
  const defaultDueAtValue = defaultDueAt.toISOString().slice(0, 10);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Follow-up tasks</h2>
        <p className="text-sm text-muted-foreground">
          Track who owes what by when for this company.
        </p>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No follow-up tasks yet.
          </div>
        ) : (
          tasks.map((task) => (
            <form
              key={task.id}
              action={updateTaskAction.bind(null, task.id)}
              className="space-y-4 rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                {task.status === "open" ? (
                  <Button
                    formAction={completeTaskAction.bind(null, task.id)}
                    type="submit"
                    size="sm"
                    variant="outline"
                  >
                    Mark done
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`task-title-${task.id}`}>Title</Label>
                  <Input
                    id={`task-title-${task.id}`}
                    name="title"
                    defaultValue={task.title}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`task-description-${task.id}`}>Description</Label>
                  <Textarea
                    id={`task-description-${task.id}`}
                    name="description"
                    defaultValue={task.description ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`task-status-${task.id}`}>Status</Label>
                  <select
                    id={`task-status-${task.id}`}
                    name="status"
                    defaultValue={task.status}
                    className={selectClassName}
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`task-dueAt-${task.id}`}>Due date</Label>
                  <Input
                    id={`task-dueAt-${task.id}`}
                    name="dueAt"
                    type="date"
                    defaultValue={task.dueAt ? task.dueAt.toISOString().slice(0, 10) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`task-ownerId-${task.id}`}>Owner</Label>
                  <select
                    id={`task-ownerId-${task.id}`}
                    name="ownerId"
                    defaultValue={task.owner?.id ?? ""}
                    className={selectClassName}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name ?? user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`task-contactId-${task.id}`}>Contact</Label>
                  <select
                    id={`task-contactId-${task.id}`}
                    name="contactId"
                    defaultValue={task.contact?.id ?? ""}
                    className={selectClassName}
                  >
                    <option value="">No specific contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`task-dealId-${task.id}`}>Competition</Label>
                  <select
                    id={`task-dealId-${task.id}`}
                    name="dealId"
                    defaultValue={task.deal?.id ?? ""}
                    className={selectClassName}
                  >
                    <option value="">No linked competition</option>
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(task.dueAt)} · Owner{" "}
                {task.owner ? task.owner.name ?? task.owner.email : "Unassigned"}
              </p>
              <Button type="submit" size="sm">
                Save task
              </Button>
            </form>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="font-medium">Add follow-up task</h3>
        <form action={createTaskAction.bind(null, companyId)} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-task-title">Title</Label>
            <Input id="new-task-title" name="title" required placeholder="Send pilot recap" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-task-description">Description</Label>
            <Textarea id="new-task-description" name="description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-task-dueAt">Due date</Label>
            <Input id="new-task-dueAt" name="dueAt" type="date" defaultValue={defaultDueAtValue} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-task-ownerId">Owner</Label>
            <select id="new-task-ownerId" name="ownerId" defaultValue="" className={selectClassName}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-task-contactId">Contact</Label>
            <select id="new-task-contactId" name="contactId" defaultValue="" className={selectClassName}>
              <option value="">No specific contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-task-dealId">Competition</Label>
            <select id="new-task-dealId" name="dealId" defaultValue="" className={selectClassName}>
              <option value="">No linked competition</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add task</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
