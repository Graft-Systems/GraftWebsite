"use client";

import { useState } from "react";

import type { SplitBucket } from "@/lib/admin/capital/parse";

import { updateCapitalSplitBucketsAction } from "@/app/admin/actions/capital";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { splitBucketTotalPercent } from "@/lib/admin/capital/parse";

type SplitBucketsEditorProps = {
  initialBuckets: SplitBucket[];
};

const emptyRow: SplitBucket = { key: "", label: "", percent: 0 };

export function SplitBucketsEditor({ initialBuckets }: SplitBucketsEditorProps) {
  const [rows, setRows] = useState<SplitBucket[]>(
    initialBuckets.length > 0 ? initialBuckets : [
      { key: "ops", label: "Operations", percent: 40 },
      { key: "growth", label: "Growth", percent: 35 },
      { key: "reserve", label: "Reserve", percent: 25 },
    ],
  );

  const total = splitBucketTotalPercent(rows);
  const delta = Math.round((100 - total) * 10) / 10;

  return (
    <form action={updateCapitalSplitBucketsAction} className="space-y-4">
      <input type="hidden" name="bucketsJson" value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label className="text-xs">Key</Label>
              <Input
                value={row.key}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, key: event.target.value };
                  setRows(next);
                }}
                placeholder="burn"
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label className="text-xs">Label</Label>
              <Input
                value={row.label}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, label: event.target.value };
                  setRows(next);
                }}
                placeholder="Burn runway"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">%</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={row.percent || ""}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, percent: Number(event.target.value) || 0 };
                  setRows(next);
                }}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows([...rows, { ...emptyRow }])}
        >
          Add bucket
        </Button>
        <p className={`text-sm ${Math.abs(delta) < 0.05 ? "text-muted-foreground" : "text-amber-600"}`}>
          Total {total.toFixed(1)}% · {Math.abs(delta) < 0.05 ? "Balanced" : `${delta > 0 ? "Add" : "Remove"} ${Math.abs(delta).toFixed(1)}%`}
        </p>
      </div>
      <Button type="submit" disabled={Math.abs(delta) > 0.05}>
        Save split rules
      </Button>
    </form>
  );
}
