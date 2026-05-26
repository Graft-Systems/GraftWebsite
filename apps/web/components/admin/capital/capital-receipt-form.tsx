import { createCapitalReceiptAction } from "@/app/admin/actions/capital";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { CAPITAL_RECEIPT_SOURCES } from "@/lib/admin/constants";
import { cn } from "@/lib/admin/utils";

type CapitalReceiptFormProps = {
  deals: Array<{
    id: string;
    name: string;
    company: { name: string } | null;
  }>;
};

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export function CapitalReceiptForm({ deals }: CapitalReceiptFormProps) {
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <form action={createCapitalReceiptAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="receipt-title">What came in</Label>
        <Input id="receipt-title" name="title" required placeholder="Series A tranche, pilot invoice…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt-amount">Amount (USD)</Label>
        <Input id="receipt-amount" name="amount" type="number" min="1" step="1" required placeholder="85000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt-source">Source</Label>
        <select id="receipt-source" name="source" defaultValue="deal" className={selectClassName}>
          {CAPITAL_RECEIPT_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt-receivedAt">Received on</Label>
        <Input id="receipt-receivedAt" name="receivedAt" type="date" defaultValue={defaultDate} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="receipt-dealId">Linked deal (optional)</Label>
        <select id="receipt-dealId" name="dealId" defaultValue="" className={selectClassName}>
          <option value="">None</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.name}
              {deal.company ? ` · ${deal.company.name}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="receipt-notes">Notes</Label>
        <Textarea id="receipt-notes" name="notes" placeholder="Contract ref, wire memo, etc." />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">Log cash in</Button>
      </div>
    </form>
  );
}
