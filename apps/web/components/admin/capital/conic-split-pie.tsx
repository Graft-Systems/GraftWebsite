"use client";

import type { SplitBucket } from "@/lib/admin/capital/parse";

const PALETTE = [
  "hsl(262 83% 58%)",
  "hsl(173 80% 40%)",
  "hsl(38 92% 50%)",
  "hsl(330 81% 60%)",
  "hsl(210 90% 52%)",
  "hsl(25 95% 53%)",
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type ConicSplitPieProps = {
  amount: number;
  buckets: SplitBucket[];
  size?: number;
};

export function ConicSplitPie({ amount, buckets, size = 140 }: ConicSplitPieProps) {
  if (!buckets.length || amount <= 0) {
    return (
      <div className="flex size-[140px] items-center justify-center rounded-full border border-dashed text-xs text-muted-foreground">
        Configure split rules
      </div>
    );
  }

  let acc = 0;
  const stops = buckets
    .map((bucket, index) => {
      const start = acc;
      acc += bucket.percent;
      const color = PALETTE[index % PALETTE.length];
      return `${color} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-full shadow-md ring-2 ring-background"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops})`,
        }}
      />
      <ul className="w-full space-y-1 text-xs text-muted-foreground">
        {buckets.map((bucket, index) => {
          const slice = (amount * bucket.percent) / 100;
          return (
            <li key={bucket.key} className="flex justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                />
                {bucket.label}
                <span className="text-muted-foreground/80">({bucket.percent}%)</span>
              </span>
              <span className="font-medium text-foreground">{formatMoney(slice)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
