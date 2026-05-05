"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid username or password.");
        } else {
          setError(data.detail || data.error || "An unexpected error occurred. Please try again.");
        }
        setLoading(false);
        return;
      }
      
      // store tokens
      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      router.push("/toolsdashboard");
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {error && (
        <p className="border-l-2 border-burgundy bg-surface/60 px-4 py-3 text-sm text-foreground/80">
          {error}
        </p>
      )}
      
      <div>
        <label htmlFor="username" className="frame flex items-center gap-2 text-[0.6rem] text-foreground-muted">
          <span>USERNAME</span>
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          autoComplete="username"
          className="mt-2 w-full border-b border-border/60 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-foreground/60 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="password" className="frame flex items-center gap-2 text-[0.6rem] text-foreground-muted">
          <span>PASSWORD</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
          className="mt-2 w-full border-b border-border/60 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-foreground/60 focus:outline-none disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="frame mt-4 inline-flex items-center justify-center gap-3 self-start rounded-sm bg-burgundy px-8 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-[#8F2433] disabled:opacity-60"
      >
        {loading ? "LOGGING IN…" : "LOG IN"}
        {!loading && (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 7h6M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}
