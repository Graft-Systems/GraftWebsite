export const palette = {
  background: "#0E0B08",
  surface: "#1A1613",
  foreground: "#F4ECE0",
  foregroundMuted: "#9A8F82",
  burgundy: "#7A1F2B",
  amber: "#E8A13A",
  sage: "#6B8E5A",
  border: "#2A241F",
} as const;

export type PaletteToken = keyof typeof palette;
