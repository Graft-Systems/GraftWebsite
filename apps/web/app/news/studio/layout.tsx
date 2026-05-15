"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { NewsStudioShell } from "@/components/news/NewsStudioShell";
import { useNewsroomMe } from "@/lib/newsApi";

export default function NewsStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { me, loading, error } = useNewsroomMe();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/news/studio");
      return;
    }
    if (!loading && me && !me.can_publish && !me.can_manage_permissions) {
      router.replace("/news");
    }
  }, [isLoaded, isSignedIn, loading, me, router]);

  if (!isLoaded || loading) {
    return (
      <main className="min-h-dvh bg-background">
        <p className="px-6 pt-32 text-sm text-foreground/60">Loading studio…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh bg-background px-6 pt-32">
        <p className="text-sm text-red-300/90">{error}</p>
      </main>
    );
  }

  if (!me?.can_publish && !me?.can_manage_permissions) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-background">
      <NewsStudioShell>{children}</NewsStudioShell>
    </main>
  );
}
