import type { DashboardBlock } from "@/lib/sprayApi";

export type BlockRiskBand = "spray" | "scout" | "danger" | "ok";

/** Map fill colors (hex) aligned with dashboard risk semantics. */
export const RISK_FILL_HEX: Record<BlockRiskBand, string> = {
  spray: "#ef4444",
  scout: "#eab308",
  danger: "#ea580c",
  ok: "#22c55e",
};

function pmiTierIsElevated(tier: string | null | undefined): boolean {
  const t = (tier || "").toLowerCase();
  return t === "moderate" || t === "high" || t === "extreme";
}

function pmiTierIsDanger(tier: string | null | undefined): boolean {
  const t = (tier || "").toLowerCase();
  return t === "high" || t === "extreme";
}

/**
 * Spray → red; scout → yellow; hold with high/extreme risk or PMI → orange;
 * hold otherwise → green; no verdict but elevated PMI → yellow.
 */
export function blockRiskBand(block: DashboardBlock): BlockRiskBand {
  const v = block.latest_verdict;
  const action = v?.action;
  const pmiTier = block.latest_pmi_tier;

  if (action === "spray") return "spray";
  if (action === "scout") return "scout";

  if (action === "hold") {
    const risk = v?.directive?.risk_level;
    if (risk === "high" || risk === "extreme") return "danger";
    if (pmiTierIsDanger(pmiTier)) return "danger";
    return "ok";
  }

  if (!v && pmiTierIsElevated(pmiTier)) return "scout";

  return "ok";
}
