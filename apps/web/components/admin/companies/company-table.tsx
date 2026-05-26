import Link from "next/link";

import { Badge } from "@/components/admin/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { formatDate, parseTags } from "@/lib/admin/crm";

type CompanyTableProps = {
  companies: Array<{
    id: string;
    name: string;
    domain: string | null;
    needs: string | null;
    updatedAt: Date;
    tags: unknown;
    relationshipStage: { label: string } | null;
    accountOwner: { name: string | null; email: string };
    contacts: Array<{ id: string; name: string; isPrimary: boolean }>;
    _count: {
      followUpTasks: number;
      deals: number;
    };
  }>;
};

const tableShell =
  "[&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_td]:px-3 [&_td]:py-3 [&_td]:align-top";

export function CompanyTable({ companies }: CompanyTableProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">No companies match these filters.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a company or broaden your search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table
        className={`table-fixed min-w-[920px] ${tableShell} [&_thead_tr]:border-border [&_thead_tr]:bg-muted/30`}
      >
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "6%" }} />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stage
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Owner
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Needs
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Open tasks
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Competitions
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contacts
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last updated
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const primaryContact =
              company.contacts.find((contact) => contact.isPrimary) ?? company.contacts[0];
            const needsText = company.needs?.trim();

            return (
              <TableRow key={company.id} className="border-border">
                <TableCell className="min-w-0 whitespace-normal">
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                  {company.domain ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {company.domain}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  {company.relationshipStage ? (
                    <Badge variant="secondary" className="font-medium">
                      {company.relationshipStage.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal text-sm leading-snug">
                  <span className="text-foreground">
                    {company.accountOwner.name ?? company.accountOwner.email}
                  </span>
                </TableCell>
                <TableCell className="min-w-0 max-w-0 whitespace-normal wrap-break-word">
                  {needsText ? (
                    <p
                      className="line-clamp-4 text-sm leading-relaxed text-muted-foreground"
                      title={needsText}
                    >
                      {needsText}
                    </p>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  <span className="font-medium text-foreground">
                    {company._count.followUpTasks}
                  </span>
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <span className="tabular-nums font-medium text-foreground">
                    {company._count.deals}
                  </span>
                  <p className="text-xs text-muted-foreground">open</p>
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <p className="tabular-nums font-medium text-foreground">
                    {company.contacts.length}
                  </p>
                  {primaryContact ? (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {primaryContact.name}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(company.tags).length > 0 ? (
                      parseTags(company.tags).map((tag) => (
                        <Badge key={tag} variant="outline" className="font-normal">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-sm tabular-nums text-muted-foreground">
                  {formatDate(company.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
