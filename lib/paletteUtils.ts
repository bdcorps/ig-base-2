import type { BrandKit } from "@/lib/brandKit";
import type { Palette } from "@/lib/schema";

/**
 * Pure, client-safe color helpers for turning a user's brand kit into the three
 * semantic roles a slide design needs (background / text / accent). These live
 * apart from `brandPalette.ts` so they can be imported into client components
 * without pulling in the server-only AI SDK.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (short) {
    return `#${short[1]
      .split("")
      .map((c) => `${c}${c}`)
      .join("")}`.toLowerCase();
  }
  return null;
}

export function luminance(hex: string): number {
  const h = (normHex(hex) ?? "#000000").slice(1);
  const channels = [0, 2, 4].map((i) => {
    const v = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Near-black or near-white, whichever reads better on `bg`. */
export function readableText(bg: string): string {
  return contrast(bg, "#111111") >= contrast(bg, "#ffffff") ? "#111111" : "#ffffff";
}

function toRgb(hex: string): [number, number, number] {
  const h = (normHex(hex) ?? "#000000").slice(1);
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Linearly blend two hex colors. `t` = 0 returns `a`, `t` = 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const channel = (x: number, y: number) => clamp(x + (y - x) * t);
  return `#${[channel(ar, br), channel(ag, bg), channel(ab, bb)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Fill in the `secondary` and `neutral` roles of a palette. Used to upgrade a
 * legacy background/text/accent palette to the full 5-role system: secondary is
 * a softened accent, neutral is a muted mid-tone between text and background.
 */
export function withDerivedRoles(palette: {
  background: string;
  text: string;
  accent: string;
  secondary?: string;
  neutral?: string;
}): Palette {
  return {
    background: palette.background,
    text: palette.text,
    accent: palette.accent,
    secondary: palette.secondary ?? mix(palette.accent, palette.background, 0.4),
    neutral: palette.neutral ?? mix(palette.text, palette.background, 0.55),
  };
}

/** Deterministic fallback mapping based on brightness + the "main" color. */
export function brandPaletteHeuristic(brandKit: BrandKit): Palette {
  const colors = brandKit.colors
    .map((c) => normHex(c.hex))
    .filter((c): c is string => c !== null);

  const main =
    normHex(brandKit.colors.find((c) => c.isMain)?.hex) ?? colors[0] ?? "#1f2a44";

  if (colors.length === 0) {
    return withDerivedRoles({ background: "#f4f1ea", text: "#1f2a44", accent: main });
  }

  const sorted = [...colors].sort((a, b) => luminance(b) - luminance(a));
  const background = sorted[0];
  let text = sorted[sorted.length - 1];

  let accent = main;
  if (accent === background || accent === text) {
    accent = colors.find((c) => c !== background && c !== text) ?? main;
  }

  if (contrast(background, text) < 4.5) text = readableText(background);

  // Prefer unused brand colors for secondary/neutral; otherwise derive them.
  const used = new Set([background, text, accent]);
  const spare = colors.filter((c) => !used.has(c));
  const secondary = spare[0];
  const neutral = spare[1] ?? spare[0];

  return withDerivedRoles({ background, text, accent, secondary, neutral });
}
