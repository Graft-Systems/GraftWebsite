import { STALE_DAYS_OPTIONS } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

type CompanyFiltersProps = {
  users: Array<{ id: string; name: string | null; email: string }>;
  stages: Array<{ id: string; label: string }>;
  tags: string[];
  values: {
    q?: string;
    stageId?: string;
    tag?: string;
    ownerId?: string;
    staleDays?: string;
  };
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export function CompanyFilters({ users, stages, tags, values }: CompanyFiltersProps) {
  return (
    <form method="get" className="grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2 xl:grid-cols-5">
      <div className="space-y-2 xl:col-span-2">
        <label className="text-sm font-medium" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Company, domain, contact, notes"
          className={selectClassName}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="stageId">
          Stage
        </label>
        <select
          id="stageId"
          name="stageId"
          defaultValue={values.stageId ?? ""}
          className={selectClassName}
        >
          <option value="">All stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="tag">
          Tag
        </label>
        <input
          id="tag"
          name="tag"
          list="company-tag-options"
          defaultValue={values.tag ?? ""}
          placeholder="warm-intro"
          className={selectClassName}
        />
        <datalist id="company-tag-options">
          {tags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ownerId">
          Owner
        </label>
        <select
          id="ownerId"
          name="ownerId"
          defaultValue={values.ownerId ?? ""}
          className={selectClassName}
        >
          <option value="">All owners</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="staleDays">
          Stale since
        </label>
        <select
          id="staleDays"
          name="staleDays"
          defaultValue={values.staleDays ?? ""}
          className={selectClassName}
        >
          <option value="">Any activity</option>
          {STALE_DAYS_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days}+ days
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-5">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply filters
        </button>
        <a
          href="/admin/companies"
          className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
