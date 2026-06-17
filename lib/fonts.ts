import type { Palette, Theme } from "@/lib/schema";

/**
 * Curated list of Google fonts offered in the UI. Each is loaded at runtime by
 * injecting a <link> to fonts.googleapis.com (see Controls), so adding to this
 * list requires no build step.
 */
export const GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Fraunces",
  "DM Serif Display",
  "Archivo Black",
  "Anton",
  "Bebas Neue",
  "Oswald",
  "Lora",
  "Space Grotesk",
  "Work Sans",
  "Manrope",
] as const;

export type GoogleFont = (typeof GOOGLE_FONTS)[number];

/** Build the fonts.googleapis.com URL for a set of families (weights 400..900). */
export function googleFontsHref(families: string[]): string {
  const unique = Array.from(new Set(families));
  const params = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Preset palettes distilled from the /samples looks. */
export const PRESET_PALETTES: { name: string; palette: Palette }[] = [
  {
    name: "Soft Blue",
    palette: { background: "#9db4d8", text: "#1f2a44", accent: "#e8743b" },
  },
  {
    name: "Cream Editorial",
    palette: { background: "#f4f1ea", text: "#211d17", accent: "#c2603a" },
  },
  {
    name: "Bold Dark",
    palette: { background: "#0e0e0e", text: "#ffffff", accent: "#f0654a" },
  },
  {
    name: "Mint Fresh",
    palette: { background: "#0f5e4e", text: "#f3fff8", accent: "#ffd166" },
  },
];

export const DEFAULT_THEME: Theme = {
  palette: PRESET_PALETTES[0].palette,
  fonts: { heading: "Archivo Black", body: "Inter" },
};
