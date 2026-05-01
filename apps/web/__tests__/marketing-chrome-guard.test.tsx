/**
 * MarketingChromeGuard tests (M0-02a step 10).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingChromeGuard } from "@/components/layout/MarketingChromeGuard";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("MarketingChromeGuard", () => {
  function renderAt(pathname: string) {
    (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(pathname);
    return render(
      <MarketingChromeGuard>
        <nav data-testid="marketing-chrome">marketing</nav>
      </MarketingChromeGuard>
    );
  }

  it("renders chrome on the homepage", () => {
    renderAt("/");
    expect(screen.getByTestId("marketing-chrome")).toBeInTheDocument();
  });

  it("renders chrome on the bare /spray landing", () => {
    renderAt("/spray");
    expect(screen.getByTestId("marketing-chrome")).toBeInTheDocument();
  });

  it("hides chrome on /spray/dashboard", () => {
    renderAt("/spray/dashboard");
    expect(screen.queryByTestId("marketing-chrome")).not.toBeInTheDocument();
  });

  it("hides chrome on /spray/onboarding", () => {
    renderAt("/spray/onboarding");
    expect(screen.queryByTestId("marketing-chrome")).not.toBeInTheDocument();
  });

  it("hides chrome on /spray/post-login", () => {
    renderAt("/spray/post-login");
    expect(screen.queryByTestId("marketing-chrome")).not.toBeInTheDocument();
  });
});
