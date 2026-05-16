import type { Prisma } from "@/generated/prisma/client";

export type SplitBucket = {
  key: string;
  label: string;
  percent: number;
};

export function parseSplitBuckets(value: unknown): SplitBucket[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const percent =
        typeof record.percent === "number" && Number.isFinite(record.percent)
          ? record.percent
          : Number(record.percent);

      if (!key || !label || !Number.isFinite(percent)) {
        return null;
      }

      return { key, label, percent };
    })
    .filter((item): item is SplitBucket => Boolean(item));
}

export function normalizeSplitBuckets(buckets: SplitBucket[]): SplitBucket[] {
  return buckets
    .map((bucket) => ({
      key: bucket.key.replace(/\s+/g, "_").toLowerCase(),
      label: bucket.label.trim(),
      percent: Math.round(bucket.percent * 100) / 100,
    }))
    .filter((bucket) => bucket.key && bucket.label && bucket.percent > 0);
}

export function splitBucketsToJson(buckets: SplitBucket[]): Prisma.InputJsonValue {
  return buckets as unknown as Prisma.InputJsonValue;
}

export function splitBucketTotalPercent(buckets: SplitBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.percent, 0);
}
