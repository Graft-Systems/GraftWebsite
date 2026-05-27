import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Titillium_Web } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { FilmGrain } from "@/components/effects/FilmGrain";
import { Nav } from "@/components/layout/Nav";
import { NavAdminLink } from "@/components/layout/NavAdminLink";
import { Footer } from "@/components/layout/Footer";
import { MarketingChromeGuard } from "@/components/layout/MarketingChromeGuard";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

const titillium = Titillium_Web({
  subsets: ["latin"],
  variable: "--font-frame",
  display: "swap",
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Graft Systems — Vineyard software for yield, spray, and canopy work",
  description:
    "Graft Systems builds a winery software suite: yield estimation previews from imagery, Graft Spray for powdery mildew spray intelligence, and research into UV-C canopy grids—developed with growers.",
  metadataBase: new URL("https://graft.systems"),
  openGraph: {
    title: "Graft Systems",
    description:
      "Vineyard software suite: yield previews, powdery mildew spray intelligence, and UV-C research—built with wineries.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider afterSignOutUrl="/spray">
      <html
        lang="en"
        className={`dark ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${titillium.variable}`}
      >
        <body className="antialiased">
          <LenisProvider>
            <MarketingChromeGuard>
              <Nav adminSlot={<NavAdminLink />} />
            </MarketingChromeGuard>
            {children}
            <MarketingChromeGuard>
              <Footer />
            </MarketingChromeGuard>
          </LenisProvider>
          <FilmGrain />
        </body>
      </html>
    </ClerkProvider>
  );
}
