"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type FormState = {
  name: string;
  email: string;
  vineyard_size_acres: string;
  message: string;
  website: string; // honeypot
};

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [data, setData] = useState<FormState>({
    name: "",
    email: "",
    vineyard_size_acres: "",
    message: "",
    website: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    setIssues({});

    const payload: Record<string, string | number | null> = {
      name: data.name.trim(),
      email: data.email.trim(),
      message: data.message.trim(),
      website: data.website,
    };
    if (data.vineyard_size_acres.trim()) {
      const n = Number(data.vineyard_size_acres);
      payload.vineyard_size_acres = Number.isFinite(n) ? n : data.vineyard_size_acres;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: Record<string, string>;
      };
      if (!res.ok) {
        if (body.issues) setIssues(body.issues);
        throw new Error(body.error ?? "Something went wrong.");
      }
      setStatus("success");
      setData({ name: "", email: "", vineyard_size_acres: "", message: "", website: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex flex-col items-start gap-5 rounded-sm border border-border/60 bg-surface/60 p-10"
      >
        <span className="frame text-[0.62rem] text-sage">MESSAGE SENT</span>
        <h2 className="display text-2xl text-foreground lg:text-[1.75rem]">
          Thanks — we&apos;ll be in touch.
        </h2>
        <p className="text-sm leading-relaxed text-foreground/70">
          Every message hits our inbox. Expect a reply within 24 hours.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="frame mt-2 text-[0.62rem] text-burgundy transition-colors hover:text-amber"
        >
          SEND ANOTHER →
        </button>
      </motion.div>
    );
  }

  const busy = status === "submitting";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && (
        <p className="border-l-2 border-burgundy bg-surface/60 px-4 py-3 text-sm text-foreground/80">
          {error}
        </p>
      )}

      <Field
        id="name"
        label="Name"
        value={data.name}
        onChange={(v) => set("name", v)}
        required
        issue={issues.name}
        disabled={busy}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={data.email}
        onChange={(v) => set("email", v)}
        required
        issue={issues.email}
        disabled={busy}
      />
      <Field
        id="vineyard_size_acres"
        label="Vineyard size (acres)"
        optional
        inputMode="numeric"
        value={data.vineyard_size_acres}
        onChange={(v) => set("vineyard_size_acres", v)}
        issue={issues.vineyard_size_acres}
        disabled={busy}
      />

      <div>
        <LabelRow id="message" label="Message" />
        <textarea
          id="message"
          required
          rows={5}
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
          disabled={busy}
          className="mt-2 w-full resize-none border-b border-border/60 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-foreground/60 focus:outline-none disabled:opacity-50"
          placeholder="What are you working on?"
        />
        {issues.message && (
          <p className="mt-2 text-xs text-burgundy/80">{issues.message}</p>
        )}
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={data.website}
        onChange={(e) => set("website", e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <button
        type="submit"
        disabled={busy}
        className="frame mt-4 inline-flex items-center justify-center gap-3 self-start rounded-sm bg-burgundy px-8 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-[#8F2433] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send"}
        {!busy && (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 7h6M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  optional,
  value,
  onChange,
  required,
  issue,
  disabled,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  type?: string;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  issue?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <LabelRow id={id} label={label} optional={optional} />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-2 w-full border-b border-border/60 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-foreground/60 focus:outline-none disabled:opacity-50"
      />
      {issue && <p className="mt-2 text-xs text-burgundy/80">{issue}</p>}
    </div>
  );
}

function LabelRow({
  id,
  label,
  optional,
}: {
  id: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={id} className="frame flex items-center gap-2 text-[0.6rem] text-foreground-muted">
      <span>{label.toUpperCase()}</span>
      {optional && (
        <span className="normal-case tracking-normal text-foreground-muted/70">
          (optional)
        </span>
      )}
    </label>
  );
}
