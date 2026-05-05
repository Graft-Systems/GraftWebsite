"use client";
import { useState } from "react";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Attempt the register endpoint — backend returns 403 for now.
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.detail || "Registration is currently disabled.");
        return;
      }
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
          disabled
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
          disabled
          autoComplete="new-password"
          className="mt-2 w-full border-b border-border/60 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-foreground/60 focus:outline-none disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled
        className="frame mt-4 inline-flex items-center justify-center gap-3 self-start rounded-sm bg-surface px-8 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        REGISTRATION DISABLED
      </button>
    </form>
  );
}
