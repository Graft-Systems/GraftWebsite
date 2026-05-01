/**
 * Clerk-hosted sign-up page (M0-02 step 8).
 */
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-32">
      <SignUp
        appearance={{ variables: { colorPrimary: "#c08a3e" } }}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/spray/post-login"
      />
    </main>
  );
}
