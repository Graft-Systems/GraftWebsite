import Link from "next/link";

import { TagInput } from "@/components/admin/capture/tag-input";
import { Button, buttonVariants } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { parseTags } from "@/lib/admin/crm";
import { cn } from "@/lib/admin/utils";

type CompanyFormProps = {
  action: (formData: FormData) => Promise<void>;
  users: Array<{ id: string; name: string | null; email: string }>;
  stages: Array<{ id: string; label: string }>;
  tagSuggestions: string[];
  submitLabel: string;
  company?: {
    id: string;
    name: string;
    website: string | null;
    domain: string | null;
    description: string | null;
    needs: string | null;
    relationshipStageId: string | null;
    accountOwnerId: string;
    tags: unknown;
  };
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export function CompanyForm({
  action,
  users,
  stages,
  tagSuggestions,
  submitLabel,
  company,
}: CompanyFormProps) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Company name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={company?.name}
            required
            placeholder="Acme Robotics"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={company?.website ?? ""}
            placeholder="https://acme.example"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            name="domain"
            defaultValue={company?.domain ?? ""}
            placeholder="acme.example"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={company?.description ?? ""}
            placeholder="What this organization does and why they matter to Graft."
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="needs">Needs / priorities</Label>
          <Textarea
            id="needs"
            name="needs"
            defaultValue={company?.needs ?? ""}
            placeholder="Problems they care about, constraints, timing."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationshipStageId">Relationship stage</Label>
          <select
            id="relationshipStageId"
            name="relationshipStageId"
            defaultValue={company?.relationshipStageId ?? ""}
            className={selectClassName}
          >
            <option value="">Select stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountOwnerId">Account owner</Label>
          <select
            id="accountOwnerId"
            name="accountOwnerId"
            defaultValue={company?.accountOwnerId}
            required
            className={selectClassName}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <TagInput
            name="tags"
            defaultValue={parseTags(company?.tags)}
            suggestions={tagSuggestions}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Link
          href={company ? `/companies/${company.id}` : "/companies"}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
