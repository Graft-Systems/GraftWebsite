import { prisma } from "@/lib/admin/db";

import { createWisprIngest } from "@/lib/admin/wispr/ingest";

type DemoSeedContext = {
  workspaceId: string;
  wisprConnectionId: string;
};

const DEMO_NOTES = [
  {
    externalId: "demo-voice-acme-walkthrough",
    rawText: `Quick scratchpad after the Acme walkthrough with Sarah.
The field-notes pilot is going well — they're seeing faster ticket resolution on the warehouse floor. Sarah wants a one-pager she can take to her VP.
Needs: clearer ROI story, tighter SSO integration timeline, and a security review checklist.
Next steps: send pilot recap by Friday, schedule a VP-level read-out in two weeks, loop Marcus into the security thread.`,
  },
  {
    externalId: "demo-voice-northwind-followup",
    rawText: `Follow-up note from the Northwind intro call.
Elena pushed back on price but loved the routing demo. She wants to see how we handle delivery exceptions before they consider a paid pilot.
Needs: case study on exception handling, list of current logistics customers, indicative pricing band.
Call: book a working session with her ops team next week, send the exception-handling brief.`,
  },
];

export async function seedDemoWisprIngests({ workspaceId, wisprConnectionId }: DemoSeedContext) {
  for (const note of DEMO_NOTES) {
    await createWisprIngest({
      workspaceId,
      wisprConnectionId,
      externalNoteId: note.externalId,
      rawText: note.rawText,
      receivedAt: new Date(),
    });
  }

  await prisma.wisprConnection.update({
    where: { id: wisprConnectionId },
    data: { lastSyncedAt: new Date() },
  });
}
