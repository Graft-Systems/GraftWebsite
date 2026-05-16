"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { GraftLogo } from "@/components/admin/brand/graft-logo";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/admin/auth/constants";

const emailSchema = z.string().trim().toLowerCase().email();

const ERROR_MESSAGES: Record<string, string> = {
  email: "Enter a valid email address.",
  password_short: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  invite_only:
    "Only people already added to this workspace can sign in. Ask a teammate to invite you, or use an email that's already on the team.",
  invalid_credentials:
    "Wrong email or password. If you're new here, use Create an account (opens in a new tab) to register with your name and password.",
  invalid: "Couldn't sign you in. Try again.",
};

type LoginFormProps = {
  initialErrorKey?: string | null;
};

export function LoginForm({ initialErrorKey }: LoginFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(() =>
    initialErrorKey && initialErrorKey in ERROR_MESSAGES ? initialErrorKey : null,
  );

  const errorMessage = useMemo(
    () => (errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.invalid) : null),
    [errorKey],
  );

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setErrorKey(null);

    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");

    const emailParsed = emailSchema.safeParse(typeof emailRaw === "string" ? emailRaw : "");
    if (!emailParsed.success) {
      setErrorKey("email");
      setSubmitting(false);
      return;
    }

    const email = emailParsed.data;
    const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";

    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorKey("password_short");
      setSubmitting(false);
      return;
    }

    try {
      const origin = window.location.origin;
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: `${origin}/inbox`,
      });

      if (!result) {
        setErrorKey("invalid");
        setSubmitting(false);
        return;
      }

      if (result.error) {
        const err = String(result.error);
        const credFail =
          err === "CredentialsSignin" || err.toLowerCase().includes("credential");
        setErrorKey(credFail ? "invalid_credentials" : "invalid");
        setSubmitting(false);
        return;
      }

      if (result.ok) {
        router.replace("/inbox");
        router.refresh();
        return;
      }

      setErrorKey("invalid");
    } catch {
      setErrorKey("invalid");
    }

    setSubmitting(false);
  }

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
      <GraftLogo />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Sign in to Graft CRM</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Use your email and password. New to the workspace? Use{" "}
        <span className="font-medium text-foreground">Create an account</span> below (opens in a new tab).
        Everyone shares the same workspace data.
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await handleSubmit(formData);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="owner@graft.systems"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Continue"}
        </Button>
      </form>
      <div className="mt-6 border-t border-border pt-6 text-center text-sm">
        <p className="font-medium text-foreground">New here?</p>
        <p className="mt-1 text-muted-foreground">
          Create an account with your details — opens in a new tab.
        </p>
        <Link
          href="/admin/welcome"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Everyone chooses their own password. Seeded workspace emails don&apos;t start with a saved password —
        your first successful login stores the password you enter. Re-running{" "}
        <span className="font-mono text-[11px]">npm run db:seed</span> does not reset passwords already set.
      </p>
    </div>
  );
}
