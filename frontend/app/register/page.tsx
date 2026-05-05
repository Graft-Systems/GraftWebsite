"use client";
import Link from "next/link";
import RegisterForm from "../../components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="relative min-h-dvh bg-background pt-32 pb-24">
      <div className="mx-auto max-w-[500px] px-6 lg:px-10 lg:pt-12">
        <span className="frame text-[0.72rem] font-semibold text-sage">
          JOIN GRAFT
        </span>
        <h1 className="display mt-5 text-display-lg text-foreground">
          Register.
        </h1>
        <p className="mt-6 mb-12 max-w-sm text-base leading-relaxed text-foreground/75 sm:text-lg">
          Registration is currently disabled because the platform is invite-only. If you have an account, you can log in below.
        </p>

        <RegisterForm />

        <div className="mt-10 pt-8 border-t border-border/40">
          <p className="text-sm text-foreground/70">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground transition-colors hover:text-amber">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
