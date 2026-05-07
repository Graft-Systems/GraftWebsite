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
