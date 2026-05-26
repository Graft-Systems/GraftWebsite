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
import { DEAL_STAGES } from "@/lib/admin/constants";
import { formatDate, summarizeText } from "@/lib/admin/crm";

type DealTableProps = {
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    valueEstimate: number | null;
    expectedClose: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    link: string | null;
    company: { id: string; name: string } | null;
    owner: { name: string | null; email: string } | null;
    notes: string | null;
  }>;
};

function stageLabel(stage: string) {
  return DEAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

function formatValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateRange(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt) {
    return `${formatDate(startsAt)} → ${formatDate(endsAt)}`;
  }
  if (startsAt) return formatDate(startsAt);
  if (endsAt) return formatDate(endsAt);
  return "—";
}

export function DealTable({ deals }: DealTableProps) {
  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-12 text-center">
        <p className="text-sm font-medium">No competitions match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competition</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="max-w-56">Additional</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Prize</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>
                <p className="font-medium">{deal.name}</p>
                {deal.link ? (
                  <a
                    href={deal.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {new URL(deal.link).hostname.replace(/^www\./, "")} ↗
                  </a>
                ) : null}
              </TableCell>
              <TableCell>
                {deal.company ? (
                  <Link href={`/admin/companies/${deal.company.id}`} className="hover:underline">
                    {deal.company.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-56">
                <p className="text-sm text-muted-foreground">
                  {summarizeText(deal.notes, 100) || "—"}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{stageLabel(deal.stage)}</Badge>
              </TableCell>
              <TableCell>{deal.owner ? deal.owner.name ?? deal.owner.email : "—"}</TableCell>
              <TableCell>{dateRange(deal.startsAt, deal.endsAt)}</TableCell>
              <TableCell>{formatDate(deal.expectedClose)}</TableCell>
              <TableCell>{formatValue(deal.valueEstimate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
