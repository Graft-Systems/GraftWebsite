"use server";

import { revalidatePath } from "next/cache";

import { crmFetch } from "@/lib/admin/api";
import { requireAdmin } from "@/lib/admin/auth-check";

export async function sendTestDigestAction() {
  await requireAdmin();
  const result = await crmFetch("/email-digests/send_test/", {
    method: "POST"
  });
  if (!result) {
    throw new Error("Could not build digest for this account.");
  }
  revalidatePath("/admin/settings");
}

export async function runDailyDigestNowAction() {
  await requireAdmin();
  await crmFetch("/email-digests/run_daily/", {
    method: "POST"
  });
  revalidatePath("/admin/settings");
}

export async function deleteDigestAction(digestId: string) {
  await requireAdmin();
  await crmFetch(`/email-digests/${digestId}/`, {
    method: "DELETE"
  });
  revalidatePath("/admin/settings");
}
