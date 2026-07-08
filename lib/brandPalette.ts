import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { BrandKit } from "@/lib/brandKit";
import type { Palette } from "@/lib/schema";
import {
  brandPaletteHeuristic,
  contrast,
  normHex,
  readableText,
  withDerivedRoles,
} from "@/lib/paletteUtils";
import { z } from "zod";

/**
 * Translate a user's brand kit (a flat list of colors + one "main") into the
 * five semantic roles a slide design needs — background / text / accent /
 * secondary / neutral. The mapping is done by an LLM so it can optimize for
 * legible contrast per the topic, with a deterministic luminance-based
 * heuristic as a safety net.
 */

export { brandPaletteHeuristic };

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
      system: `You assign a brand's colors to the five roles a slide design needs: background, text, accent, secondary, and neutral.

Rules:
- Choose each role from the brand colors listed below whenever possible.
- background: the main canvas color — pick a brand color that works well as a large surface.
- text: headings and body copy. It MUST have strong contrast against the background (aim for WCAG AA, 4.5:1 or higher). Only if NO brand color is legible on the chosen background may you return a near-black "#111111" or near-white "#ffffff".
- accent: highlights, key words, and CTA buttons — a vivid color that stands out from the background; prefer the main brand color.
- secondary: a supporting color for shapes, dividers, and badges — harmonizes with the accent but is distinct from it.
- neutral: a muted, low-saturation tone for borders, subtle fills, and quiet/secondary text. It should sit between the background and text in tone.
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
          secondary: z.string(),
          neutral: z.string(),
        }),
      }),
    });

    const out = result.output;
    const bg = normHex(out?.background);
    const text = normHex(out?.text);
    const accent = normHex(out?.accent);
    const secondary = normHex(out?.secondary);
    const neutral = normHex(out?.neutral);

    if (bg && text && accent) {
      const safeText = contrast(bg, text) >= 3 ? text : readableText(bg);
      return withDerivedRoles({
        background: bg,
        text: safeText,
        accent,
        secondary: secondary ?? undefined,
        neutral: neutral ?? undefined,
      });
    }
  } catch (err) {
    console.warn("brand palette resolution failed, using heuristic", err);
  }

  return heuristic;
}
