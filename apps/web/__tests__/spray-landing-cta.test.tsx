/**
 * SprayLandingCTA tests (M0-02a step 10).
 *
 * Stand-in for the post-login redirect logic which is a server
 * component (not directly mountable in jsdom). The CTA covers the
 * client-visible branch: signed-in users see "Open dashboard",
 * signed-out users see "Sign up" + "Log in".
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SprayLandingCTA } from "@/components/spray/SprayLandingCTA";

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@clerk/nextjs";

describe("SprayLandingCTA", () => {
  function setAuth(isLoaded: boolean, isSignedIn: boolean) {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoaded,
      isSignedIn,
    });
  }

  it("renders 'Open dashboard' for signed-in users", () => {
    setAuth(true, true);
    render(<SprayLandingCTA />);
    const link = screen.getByRole("link", { name: /open dashboard/i });
    expect(link).toHaveAttribute("href", "/spray/dashboard");
  });

  it("renders sign-up + log-in for signed-out users", () => {
    setAuth(true, false);
    render(<SprayLandingCTA />);
    expect(
      screen.getByRole("link", { name: /sign up/i })
    ).toHaveAttribute("href", "/sign-up?redirect_url=/spray/post-login");
    expect(
      screen.getByRole("link", { name: /log in/i })
    ).toHaveAttribute("href", "/sign-in?redirect_url=/spray/post-login");
  });

  it("renders a skeleton while auth is loading", () => {
    setAuth(false, false);
    const { container } = render(<SprayLandingCTA />);
    expect(container.querySelector("[class*='animate-pulse']")).toBeTruthy();
  });
});
