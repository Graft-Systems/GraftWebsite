"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function WaitlistField({
  source,
  label = "Join the waitlist",
  helper = "Early access when the tool is live. One email, no marketing.",
  size = "md",
  className,
}: {
  source: string;
  label?: string;
  helper?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Email graftsystems@gmail.com instead."
      );
    }
  }

  const labelSize = size === "lg" ? "text-sm" : size === "sm" ? "text-[0.58rem]" : "text-[0.68rem]";
  const inputSize = size === "lg" ? "text-base py-3" : size === "sm" ? "text-sm py-1.5" : "text-sm py-2.5";
  const helperSize = size === "lg" ? "text-sm" : "text-xs";

  if (status === "success") {
    return (
      <div className={cn("max-w-md", className)}>
        <p className="frame text-[0.62rem] text-sage">
          YOU&apos;RE ON THE LIST
        </p>
        <p className={cn("mt-3 text-foreground/80", helperSize)}>
          We&apos;ll be in touch as the product takes shape.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("max-w-md", className)}>
      <p className={cn("frame font-semibold uppercase tracking-[0.14em] text-foreground", labelSize)}>
        {label}
      </p>
      {helper && (
        <p className={cn("mt-2 text-foreground-muted", helperSize)}>{helper}</p>
      )}
      <form
        onSubmit={onSubmit}
        className="relative mt-4 flex items-center gap-3 border-b-2 border-burgundy/60 pb-2 transition-colors focus-within:border-burgundy"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === "loading"}
          autoComplete="email"
          aria-label="Email address for waitlist"
          className={cn(
            "flex-1 bg-transparent text-foreground placeholder:text-foreground-muted/60 focus:outline-none disabled:opacity-50",
            inputSize
          )}
        />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Join the waitlist"
          className="frame inline-flex items-center gap-2 rounded-sm bg-burgundy px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-[#8F2433] disabled:opacity-40"
        >
          {status === "loading" ? "…" : "Join"}
          {status !== "loading" && (
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 7h8M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>
      {status === "error" && errorMsg && (
        <p className="mt-3 text-xs text-burgundy/90">{errorMsg}</p>
      )}
    </div>
  );
}
