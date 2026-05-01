import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Titillium_Web } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { FilmGrain } from "@/components/effects/FilmGrain";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
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
  title: "Graft Systems — Know your yield before the harvest",
  description:
    "Yield intelligence for the modern vineyard. Graft returns a probability distribution for every estimate, so growers plan for what's likely — not just what's possible.",
  metadataBase: new URL("https://graft.systems"),
  openGraph: {
    title: "Graft Systems",
    description: "Know your yield before the harvest.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`dark ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${titillium.variable}`}
      >
        <body className="antialiased">
          <LenisProvider>
            <Nav />
            {children}
            <Footer />
          </LenisProvider>
          <FilmGrain />
        </body>
      </html>
    </ClerkProvider>
  );
}
