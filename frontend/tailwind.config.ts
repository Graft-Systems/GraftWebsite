import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        "foreground-muted": "hsl(var(--foreground-muted) / <alpha-value>)",
        burgundy: {
          DEFAULT: "hsl(var(--burgundy) / <alpha-value>)",
          dim: "hsl(var(--burgundy) / 0.6)",
        },
        amber: "hsl(var(--amber) / <alpha-value>)",
        sage: "hsl(var(--sage) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        frame: ["var(--font-frame)", "ui-sans-serif", "sans-serif"],
      },
      fontSize: {
        "eyebrow": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
        "display-xl": ["clamp(2.75rem, 6vw, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.5rem, 3vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      keyframes: {
        "ken-burns": {
          "0%, 100%": { transform: "scale(1) translate(0, 0)" },
          "50%": { transform: "scale(1.04) translate(-0.5%, -0.5%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.9" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "ken-burns": "ken-burns 24s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
