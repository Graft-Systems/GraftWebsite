# Customer Context

Why the system looks the way it does. The empirical basis for every product decision.

## The pivot rationale (SA-2, 2026-05-07)

The spec went through a major amendment one day before this handoff. The original M0 design was per-photo computer-vision detection - "snap a leaf, get a severity grade." Customer signal killed that path.

## The five winery conversations

Between 2026-04-15 and 2026-05-05 Benson talked to five winery operators independently across Napa + Sonoma. Every single one said some version of:

> "If you see mold, it's already too late."

Names + roles:

| Winery | Contact | Role | Meeting type | Date |
|---|---|---|---|---|
| Far Niente | John McCarthy | Director of Vineyard Operations | In-person, on-site | 2026-05-05 |
| Newton Vineyards | (TBD) | Vineyard team | Phone | (TBD) |
| Chandon | (TBD) | Vineyard team | Phone | (TBD) |
| Sprucewood Shores | (TBD) | Owner | Phone | (TBD) |
| (one more) | (TBD) | (TBD) | (TBD) | (TBD) |

McCarthy's exact framing (paraphrased): wineries already use a smattering of weather sources (CIMIS, UC IPM newsletters, their own intuition), but no single tool tells them when to spray with confidence. They want fewer sprays (cost + organic-cert risk), and they want to time the sprays correctly. Visible mold = a financial event already in motion.

## What the customer actually wants

Distilled across the five conversations:

1. **A daily verdict, not a tool.** "Spray today / hold / scout your blocks." Not "here's a risk index from 0-100; you figure it out."
2. **Reasons + citations.** They distrust black boxes. They want to know "the Gubler-Thomas index hit 90 because we had 6 hours at 25°C with 88% RH."
3. **Integration with what they already pay for.** Davis, Pessl, METER are common. They don't want to buy new hardware.
4. **Tamper-evident audit trail.** California PUR + organic certification both demand documentation. A grower needs to defend their spray decisions to CDPR auditors years later.
5. **Free or near-free.** Wineries are price-sensitive even when revenue is high. Margins are slim outside the Cult-Napa tier.

## How the system answers each of those

| Customer ask | System response |
|---|---|
| Daily verdict | `BlockVerdict` with `action: spray|hold|scout` + `urgency: now|24h|72h|none`. Rendered as a `VerdictCard` on the dashboard. |
| Reasons + citations | `drivers` array with `[citation_id]` markers. P-Cite verifier enforces every citation resolves via `sources_master.csv`. |
| Vendor integrations | PR-D + PR-E ship Pessl, Davis, METER. Sencrop in Phase 2. |
| Audit trail | Every verdict has an `audit_hash` (sha256). Audit PDF endpoint regenerates on demand; hashes match against the live verdict. |
| Free | Visual Crossing free tier covers regional weather; aggregation runs are commodity compute on Render. The customer pays for their own sensors. |

## The wedge

> "If you see mold, it's already too late."

That's the one-sentence pitch to any wine grower. Everything in the codebase is built around making that statement actionable: predict pressure before the visible event, surface the reason, let the grower decide.

## Who matters most for the first pilot

**John McCarthy at Far Niente.** Warmest contact, in-person meeting, explicit interest. He already operates Davis stations. The ask:

> Give us read access to your Davis WeatherLink account. We'll send you a daily verdict for each of your blocks for the next 30 days. No charge, no commitment. If it's useful, we keep going.

Liaison can draft the email when Benson's ready to send. Pre-condition: PR-D + PR-E live-smoked end to end (currently blocked only on Benson personally not having Davis hardware; once he hands over McCarthy's credentials it's a paste-key away).

## Secondary contacts

- Nantucket Wine & Food Festival (2026-05-24 to 2026-05-31). Benson is there as culinary team. Networking opportunity with Northeast + visiting wineries. Calendar event already in his timeline.
- Sprucewood Shores - Canadian operator. Different region; could be the first Canadian beta.
- Newton, Chandon - Napa proper; reach out after Far Niente lights up.

## Strategic context

- Benson starts Moelis IB summer analyst 2026-06-01. Bandwidth for customer work drops to near zero June 1 through August 7.
- The Napa launch story has to be told before June 1 (and ideally before the Nantucket trip 2026-05-24).
- That means: PR-G + PR-H are nice-to-haves. The decision-intelligence pipeline (already shipped) is the demo.

## What NOT to promise customers

Spec §12B.1 calls this out explicitly:

> Per Kanaley et al. 2024 [10-S8] no satellite VI reliably detects pre-symptomatic mildew. Satellite contributes canopy vigor context, soil-moisture pre-conditioning, and post-symptomatic damage extent - not prevention. UI must not imply otherwise.

The verdict is mechanistic-model-driven (weather + sensors + advisory feeds). Satellite is a feature, not the feature. Don't oversell it when it lands in PR-G.

Similarly: no LLM-authored numbers. The deterministic floor is the contract. P-Cite verifier exists because growers cannot trust a system that occasionally hallucinates a severity score.

## Liability watch

Spec risk register R26: prescriptive-advice liability. We say "spray" not "do not spray product X at rate Y." Recommendation engine never names a chemical product or rate. That's the grower's call, with their own PCA / agronomist. Crossing that line opens us up to CDPR licensing requirements + potential lawsuits if a recommended product fails.

Stay on this side of the line. If a feature request crosses it, escalate to Benson before building.
