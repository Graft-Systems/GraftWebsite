import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/admin/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const adminEmails = process.env.CRM_ADMIN_EMAILS?.split(",") || ["owner@graft.systems"];
  
  if (email && !adminEmails.includes(email)) {
    console.warn(`Access denied for ${email}. Add to CRM_ADMIN_EMAILS.`);
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        userName={user.firstName ? `${user.firstName} ${user.lastName || ''}` : email}
        userEmail={email}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
