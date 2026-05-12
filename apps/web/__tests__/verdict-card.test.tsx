/**
 * VerdictCard test (M1.5 PR-F).
 *
 * Locks the schema-validated numbers shown verbatim and the "why this
 * verdict?" expander surfacing cited drivers. Spec §13B.1: BlockVerdict
 * IS the daily card; UI must never originate or paraphrase numbers.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { VerdictCard, type Verdict } from "@/components/spray/VerdictCard";

const VERDICT: Verdict = {
  id: "v-1",
  block: "b-1",
  date: "2026-05-07",
  powdery_severity_1_10: "7.20",
  downy_severity_1_10: "3.10",
  powdery_confidence: "0.85",
  downy_confidence: "0.55",
  action: "spray",
  urgency: "24h",
  drivers: [
    {
      model: "gubler_thomas_2013",
      value: 92,
      threshold: 60,
      citation_id: "GUBLER_2013",
      weight: 0.5,
    },
  ],
  split_summary: "Powdery elevated; downy quiet.",
  forecast_7d: [],
  advisory_events: [],
  model_versions: { gubler_thomas: "1.0.0" },
  generated_at: "2026-05-07T12:00:00Z",
  audit_hash: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  directive: {
    risk_level: "high",
    risk_score_1_10: 7.2,
    primary_risk: "powdery mildew",
    when_to_spray: "Spray within 24 hours if operating conditions stay suitable.",
    what_to_spray: "Use an effective powdery mildew material selected by label, crop stage, organic/conventional program, and FRAC rotation.",
    where_to_spray: ["Treat Klein A."],
    when_not_to_spray: [
      "Do not spray if wind, rain, temperature, REI/PHI, or label restrictions are outside your program limits.",
    ],
    confidence_note: "Model and evidence confidence are strong enough for normal operational use.",
  },
};

describe("VerdictCard", () => {
  it("renders schema numbers verbatim and the action chip", () => {
    const { getByText } = render(
      <VerdictCard verdict={VERDICT} blockName="Klein A" />,
    );
    expect(getByText("Klein A")).toBeTruthy();
    expect(getByText("Spray")).toBeTruthy();
    expect(getByText("Within 24h")).toBeTruthy();
    expect(getByText(/7\.2\/10/)).toBeTruthy();
    expect(getByText(/3\.1\/10/)).toBeTruthy();
    expect(getByText("Powdery elevated; downy quiet.")).toBeTruthy();
    expect(getByText("Directive")).toBeTruthy();
    expect(getByText(/HIGH risk from powdery mildew/)).toBeTruthy();
    expect(getByText(/Spray within 24 hours/)).toBeTruthy();
    expect(getByText(/What to spray/)).toBeTruthy();
    expect(getByText(/Where to spray/)).toBeTruthy();
    expect(getByText(/When not to spray/)).toBeTruthy();
  });

  it("expands drivers with citation_id markers", () => {
    const { getByRole, queryByText, getByText } = render(
      <VerdictCard verdict={VERDICT} />,
    );
    expect(queryByText("gubler_thomas_2013")).toBeNull();
    fireEvent.click(getByRole("button", { name: /why this verdict/i }));
    expect(getByText("gubler_thomas_2013")).toBeTruthy();
    expect(getByText("[GUBLER_2013]")).toBeTruthy();
  });

  it("shows hold action when verdict is hold", () => {
    const hold: Verdict = { ...VERDICT, action: "hold", urgency: "none" };
    const { getByText, queryByText } = render(<VerdictCard verdict={hold} />);
    expect(getByText("Hold")).toBeTruthy();
    expect(queryByText("Within 24h")).toBeNull();
  });
});
