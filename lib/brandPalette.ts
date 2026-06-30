import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { BrandKit } from "@/lib/brandKit";
import type { Palette } from "@/lib/schema";
import { z } from "zod";

/**
 * Translate a user's brand kit (a flat list of colors + one "main") into the
 * three semantic roles a slide design needs — background / text / accent. The
 * mapping is done by an LLM so it can optimize for legible contrast per the
 * topic, with a deterministic luminance-based heuristic as a safety net.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normHex(value: string | undefined | null): string | null {
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

function luminance(hex: string): number {
  const h = (normHex(hex) ?? "#000000").slice(1);
  const channels = [0, 2, 4].map((i) => {
    const v = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Near-black or near-white, whichever reads better on `bg`. */
function readableText(bg: string): string {
  return contrast(bg, "#111111") >= contrast(bg, "#ffffff") ? "#111111" : "#ffffff";
}

/** Deterministic fallback mapping based on brightness + the "main" color. */
export function brandPaletteHeuristic(brandKit: BrandKit): Palette {
  const colors = brandKit.colors
    .map((c) => normHex(c.hex))
    .filter((c): c is string => c !== null);

  const main =
    normHex(brandKit.colors.find((c) => c.isMain)?.hex) ?? colors[0] ?? "#1f2a44";

  if (colors.length === 0) {
    return { background: "#f4f1ea", text: "#1f2a44", accent: main };
  }

  const sorted = [...colors].sort((a, b) => luminance(b) - luminance(a));
  const background = sorted[0];
  let text = sorted[sorted.length - 1];

  let accent = main;
  if (accent === background || accent === text) {
    accent = colors.find((c) => c !== background && c !== text) ?? main;
  }

  if (contrast(background, text) < 4.5) text = readableText(background);

  return { background, text, accent };
}

export async function resolveBrandPalette(
  brandKit: BrandKit,
  topic: string,
): Promise<Palette> {
  const heuristic = brandPaletteHeuristic(brandKit);

  const colorList = brandKit.colors
    .map(
      (c) =>
        `${c.hex}${c.isMain ? " (main brand color)" : ""}${c.name ? ` — ${c.name}` : ""}`,
    )
    .join("\n");

  try {
    const result = await generateText({
      model: openai("gpt-5.2"),
      system: `You assign a brand's colors to the three roles a slide design needs: background, text, and accent.

Rules:
- Choose each role from the brand colors listed below whenever possible.
- background: the main canvas color — pick a brand color that works well as a large surface.
- text: headings and body copy. It MUST have strong contrast against the background (aim for WCAG AA, 4.5:1 or higher). Only if NO brand color is legible on the chosen background may you return a near-black "#111111" or near-white "#ffffff".
- accent: highlights, key words, and CTA buttons — a vivid color that stands out from the background; prefer the main brand color.
- Return #RRGGBB hex values only.`,
      messages: [
        {
          role: "user",
          content: `Topic: ${topic || "(none)"}\n\nBrand colors:\n${colorList}`,
        },
      ],
      experimental_output: Output.object({
        schema: z.object({
          background: z.string(),
          text: z.string(),
          accent: z.string(),
        }),
      }),
    });

    const out = result.output;
    const bg = normHex(out?.background);
    const text = normHex(out?.text);
    const accent = normHex(out?.accent);

    if (bg && text && accent) {
      const safeText = contrast(bg, text) >= 3 ? text : readableText(bg);
      return { background: bg, text: safeText, accent };
    }
  } catch (err) {
    console.warn("brand palette resolution failed, using heuristic", err);
  }

  return heuristic;
}
