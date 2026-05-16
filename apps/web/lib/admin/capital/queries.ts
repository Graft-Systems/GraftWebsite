import { crmFetch } from "../api";
import { parseSplitBuckets } from "./parse";

export async function getWorkspaceRunway() {
  const workspace = await crmFetch("/workspaces/00000000-0000-4000-8000-000000000001/"); // Assuming fixed ID for now or from profile
  const receipts = await crmFetch("/capital-receipts/");

  if (!workspace) {
    return null;
  }

  return {
    workspace,
    splitBuckets: parseSplitBuckets(workspace.capitalSplitBuckets),
    receipts,
  };
}

export async function listWorkspaceDealsForSelect() {
  const deals = await crmFetch("/deals/");
  return deals.map((d: any) => ({
    id: d.id,
    name: d.name,
    company: d.company ? { name: d.company.name } : null
  }));
}
