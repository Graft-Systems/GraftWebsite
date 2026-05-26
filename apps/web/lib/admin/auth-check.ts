import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    throw new Error("Unauthorized");
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const adminEmails = process.env.CRM_ADMIN_EMAILS?.split(",") || [];
  
  if (!adminEmails.includes(email)) {
    throw new Error("Forbidden");
  }

  return { userId, user, email };
}
