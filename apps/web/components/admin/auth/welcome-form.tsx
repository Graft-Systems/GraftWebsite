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
const nameSchema = z.string().trim().min(1).max(120);

const ERROR_MESSAGES: Record<string, string> = {
  email: "Enter a valid email address.",
  name: "Enter your full name.",
  password_short: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  password_mismatch: "Passwords do not match.",
  invalid_credentials: "Wrong email or password, or this email already has a different password on file.",
  invalid: "Couldn't create your account. Try again.",
};

export function WelcomeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const errorMessage = useMemo(
    () => (errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.invalid) : null),
    [errorKey],
  );

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setErrorKey(null);

    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    const confirmRaw = formData.get("passwordConfirm");
    const nameRaw = formData.get("name");

    const emailParsed = emailSchema.safeParse(typeof emailRaw === "string" ? emailRaw : "");
    if (!emailParsed.success) {
      setErrorKey("email");
      setSubmitting(false);
      return;
    }

    const nameParsed = nameSchema.safeParse(typeof nameRaw === "string" ? nameRaw : "");
    if (!nameParsed.success) {
      setErrorKey("name");
      setSubmitting(false);
      return;
    }

    const email = emailParsed.data;
    const name = nameParsed.data;
    const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";
    const passwordConfirm = typeof confirmRaw === "string" ? confirmRaw.trim() : "";

    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorKey("password_short");
      setSubmitting(false);
      return;
    }

    if (password !== passwordConfirm) {
      setErrorKey("password_mismatch");
      setSubmitting(false);
      return;
    }

    try {
      const origin = window.location.origin;
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        name,
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
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        One shared workspace for your team. If sign-up is limited to invited members only, you’ll need to be
        added before you can join.
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
          <Label htmlFor="welcome-name">Full name</Label>
          <Input
            id="welcome-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome-email">Email</Label>
          <Input
            id="welcome-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="owner@graft.systems"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome-password">Password</Label>
          <Input
            id="welcome-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome-password-confirm">Confirm password</Label>
          <Input
            id="welcome-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder="Re-enter your password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/admin/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
