import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Graft Systems — Know Your Yield Before the Harvest",
  description:
    "Graft Systems uses AI to estimate grape cluster weight from photos. Know your yield before the harvest.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%238B2332'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='18' font-weight='bold'>G</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
