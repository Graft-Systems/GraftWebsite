/**
 * Nav tests (M0-02a step 10).
 *
 * Verifies the auth-aware "Spray" link target.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "@/components/layout/Nav";

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
  UserButton: () => <div data-testid="user-button" />,
}));

import { useAuth } from "@clerk/nextjs";

describe("Nav Spray link", () => {
  function setAuth(isLoaded: boolean, isSignedIn: boolean) {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoaded,
      isSignedIn,
    });
  }

  it("links Spray to /spray when signed out", () => {
    setAuth(true, false);
    render(<Nav />);
    const link = screen.getByRole("link", { name: "Spray" });
    expect(link).toHaveAttribute("href", "/spray");
  });

  it("links Spray to /spray/dashboard when signed in", () => {
    setAuth(true, true);
    render(<Nav />);
    const link = screen.getByRole("link", { name: "Spray" });
    expect(link).toHaveAttribute("href", "/spray/dashboard");
  });

  it("falls back to /spray while auth is still loading", () => {
    setAuth(false, false);
    render(<Nav />);
    const link = screen.getByRole("link", { name: "Spray" });
    expect(link).toHaveAttribute("href", "/spray");
  });
});
