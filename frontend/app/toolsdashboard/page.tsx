"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ToolsDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/toolsdashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          // invalid token — send to login
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          router.push("/login");
          return;
        }
        const json = await res.json();
        setData(json);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
  }

  return (
    <main className="relative min-h-dvh bg-background pt-32 pb-24">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10 lg:pt-12">
        <div className="flex items-center justify-between border-b border-border/40 pb-6 mb-12">
          <div>
            <span className="frame text-[0.72rem] font-semibold text-sage">
              DASHBOARD
            </span>
            <h1 className="display mt-4 text-display-md text-foreground">
              Internal Tools.
            </h1>
          </div>
          <button
            onClick={logout}
            className="frame text-[0.72rem] font-semibold text-burgundy transition-colors hover:text-amber uppercase tracking-wider"
          >
            Log out
          </button>
        </div>

        <div className="mt-8">
          {loading && <p className="text-foreground-muted">Loading…</p>}
          {error && <p className="text-burgundy">{error}</p>}
          {data && (
            <div className="rounded-sm border border-border/60 bg-surface/60 p-6">
              <pre className="text-sm text-foreground overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
