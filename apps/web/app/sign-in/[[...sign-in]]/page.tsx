/**
 * Clerk-hosted sign-in page (M0-02 step 8).
 *
 * Clerk's `<SignIn />` component renders the full hosted UI (email,
 * password, MFA prompts, Sign in with Apple in M2). We wrap it in a
 * centered shell so it sits inside the Graft layout without colliding
 * with the fixed nav.
 */
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-32">
      <SignIn
        appearance={{ variables: { colorPrimary: "#c08a3e" } }}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/spray/post-login"
      />
    </main>
  );
}
