import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { Palette } from "@/lib/schema";
import { z } from "zod";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const backgroundStyleSchema = z.object({
  type: z.enum(["solid", "gradient", "stripes"]),
  direction: z.enum([
    "vertical",
    "horizontal",
    "diagonal",
    "diagonal-tl-br",
    "diagonal-tr-bl",
  ])
    .nullable(),
  colors: z.array(z.string()).min(1).max(5),
});

const paletteCandidateSchema = z.object({
  name: z.string().min(1).max(60),
  backgroundColor: z.string(),
  primaryTextColor: z.string(),
  accentColor: z.string(),
  secondaryColor: z.string(),
  neutralColors: z.array(z.string()).min(2).max(4),
  backgroundStyle: backgroundStyleSchema,
});

const backgroundTargetSchema = z.object({
  explicit: z
    .boolean()
    .describe(
      "True if the user explicitly named a background color, color, or color mood (e.g. 'soothing blue', 'fiery orange', 'sky colors').",
    ),
  hue: z
    .number()
    .min(0)
    .max(360)
    .nullable()
    .describe("Target background hue in degrees, or null if no color is implied."),
  lightness: z
    .enum(["light", "medium", "dark"])
    .describe(
      "How light the background should be. 'soothing'/'pastel'/'soft' => light; 'bold'/'dramatic'/'midnight' => dark.",
    ),
  saturation: z
    .enum(["low", "medium", "high"])
    .describe(
      "Background color intensity. 'soothing'/'muted'/'calm' => low; 'vibrant'/'neon'/'fiery' => high.",
    ),
});

const moodProfileSchema = z.object({
  mood: z.string().min(1).max(80),
  primaryHue: z.number().min(0).max(360).nullable(),
  saturation: z.enum(["low", "medium", "high"]),
  brightness: z.enum(["low", "medium", "high"]),
  contrast: z.enum(["low", "medium", "high"]),
  backgroundTarget: backgroundTargetSchema,
});

const colourGeneratorSchema = z.object({
  slide: z.object({
    eyebrow: z.string().min(1).max(48),
    headline: z.string().min(1).max(90),
    subtext: z.string().min(1).max(160),
    cta: z.string().min(1).max(40),
  }),
  moodProfile: moodProfileSchema,
  palettes: z.array(paletteCandidateSchema).min(5).max(10),
});

type BackgroundStyle = z.infer<typeof backgroundStyleSchema>;
type MoodProfile = z.infer<typeof moodProfileSchema>;
type PaletteCandidate = z.infer<typeof paletteCandidateSchema>;

export type ScoredPalette = PaletteCandidate & {
  id: string;
  scores: {
    contrast: number;
    harmony: number;
    moodMatch: number;
    diversity: number;
    total: number;
  };
};

export type ColourPaletteResult = {
  slide: z.infer<typeof colourGeneratorSchema>["slide"];
  moodProfile: MoodProfile;
  palettes: ScoredPalette[];
  selectedPalette: ScoredPalette;
  selectedPaletteId: string | null;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type Hsl = {
  h: number;
  s: number;
  l: number;
};

const FALLBACK_RESULT = {
  slide: {
    eyebrow: "Color direction",
    headline: "A palette for your next carousel",
    subtext:
      "Use this intro slide as a starting point, then refine the colors to match your message.",
    cta: "Swipe to explore",
  },
  moodProfile: {
    mood: "balanced and modern",
    primaryHue: 210,
    saturation: "medium",
    brightness: "medium",
    contrast: "medium",
    backgroundTarget: {
      explicit: false,
      hue: 210,
      lightness: "light",
      saturation: "low",
    },
  } satisfies MoodProfile,
  palettes: [
    {
      name: "Soft Studio Blue",
      backgroundColor: "#EAF4FF",
      primaryTextColor: "#102A43",
      accentColor: "#247BA0",
      secondaryColor: "#7EC8E3",
      neutralColors: ["#F7FAFC", "#CBD5E1", "#64748B"],
      backgroundStyle: {
        type: "gradient",
        direction: "diagonal-tl-br",
        colors: ["#EAF4FF", "#C7E8F9"],
      },
    },
    {
      name: "Editorial Navy",
      backgroundColor: "#102A43",
      primaryTextColor: "#F8FAFC",
      accentColor: "#F7C948",
      secondaryColor: "#9FB3C8",
      neutralColors: ["#D9E2EC", "#829AB1", "#334E68"],
      backgroundStyle: {
        type: "solid",
        direction: null,
        colors: ["#102A43"],
      },
    },
    {
      name: "Warm Modern",
      backgroundColor: "#FFF7ED",
      primaryTextColor: "#431407",
      accentColor: "#EA580C",
      secondaryColor: "#FDBA74",
      neutralColors: ["#FFFBEB", "#FED7AA", "#9A3412"],
      backgroundStyle: {
        type: "gradient",
        direction: "vertical",
        colors: ["#FFF7ED", "#FED7AA"],
      },
    },
    {
      name: "Fresh Meadow",
      backgroundColor: "#F0FDF4",
      primaryTextColor: "#052E16",
      accentColor: "#16A34A",
      secondaryColor: "#86EFAC",
      neutralColors: ["#F7FEE7", "#BBF7D0", "#4B5563"],
      backgroundStyle: {
        type: "solid",
        direction: null,
        colors: ["#F0FDF4"],
      },
    },
    {
      name: "Creative Plum",
      backgroundColor: "#FAF5FF",
      primaryTextColor: "#2E1065",
      accentColor: "#7E22CE",
      secondaryColor: "#D8B4FE",
      neutralColors: ["#F5F3FF", "#DDD6FE", "#6B7280"],
      backgroundStyle: {
        type: "gradient",
        direction: "diagonal-tl-br",
        colors: ["#FAF5FF", "#E9D5FF"],
      },
    },
  ] satisfies PaletteCandidate[],
};

// Rounds and pins any score to 0–100
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Ensures hex colors are in the correct format and returns a fallback if the input is invalid
function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (HEX_COLOR_REGEX.test(trimmed)) return trimmed.toUpperCase();

  const threeDigit = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (threeDigit) {
    return `#${threeDigit[1]
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase();
  }

  return fallback;
}

// Converts a hex color to an RGB object
function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex, "#000000").slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

// Converts an RGB object to an HSL object (hue, saturation, lightness) for color math
function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;

  if (max === rn) h = ((gn - bn) / delta) % 6;
  if (max === gn) h = (bn - rn) / delta + 2;
  if (max === bn) h = (rn - gn) / delta + 4;

  return {
    h: (h * 60 + 360) % 360,
    s,
    l,
  };
}

// Calculates the relative luminance of a color. Used for contrast ratio calculation. 
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

// Calculates the contrast ratio between two colors using WCAG-style contrast between two colors
function contrastRatio(colorA: string, colorB: string): number {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const light = Math.max(lumA, lumB);
  const dark = Math.min(lumA, lumB);
  return (light + 0.05) / (dark + 0.05);
}

// Shortest distance between two hues on the color wheel in degrees (0–180°)
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

// Map words like "low" / "light" to numbers the code can compare
function targetValue(value: "low" | "medium" | "high"): number {
  if (value === "low") return 0.25;
  if (value === "high") return 0.75;
  return 0.5;
}

// Average hue, saturation, lightness across all colors in a palette
function colorStats(colors: string[]) {
  const hslColors = colors.map((color) => rgbToHsl(hexToRgb(color)));
  const avgSaturation =
    hslColors.reduce((sum, color) => sum + color.s, 0) / hslColors.length;
  const avgLightness =
    hslColors.reduce((sum, color) => sum + color.l, 0) / hslColors.length;

  const avgHue =
    hslColors.reduce((sum, color) => sum + color.h, 0) / hslColors.length;

  return {
    avgHue,
    avgSaturation,
    avgLightness,
    hslColors,
  };
}

// Collects background, text, accent, secondary, neutrals into one array
function getPaletteColors(palette: PaletteCandidate): string[] {
  return [
    palette.backgroundColor,
    palette.primaryTextColor,
    palette.accentColor,
    palette.secondaryColor,
    ...palette.neutralColors,
  ];
}

// Checks whether the palette is usable on screen by ensuring text and accent colors have sufficient contrast
function scoreContrast(palette: PaletteCandidate): number {
  const textContrast = contrastRatio(
    palette.backgroundColor,
    palette.primaryTextColor,
  );
  const accentOnBg = contrastRatio(palette.backgroundColor, palette.accentColor);
  const secondaryOnBg = contrastRatio(
    palette.backgroundColor,
    palette.secondaryColor,
  );
  const whiteOnAccent = contrastRatio("#FFFFFF", palette.accentColor);
  const darkOnAccent = contrastRatio("#111827", palette.accentColor);

  // Treat contrast as an accessibility gate, not a "darker is always better"
  // maximizer: anything at AA (4.5:1) or above earns full/near-full marks so a
  // soft, light background is not penalised against a dark one.
  const textScore =
    textContrast >= 7
      ? 55
      : textContrast >= 4.5
        ? 48
        : (textContrast / 4.5) * 32;
  const accentScore =
    Math.max(accentOnBg, whiteOnAccent, darkOnAccent) >= 4.5 ? 30 : 18;
  const secondaryScore = Math.min(secondaryOnBg / 3, 1) * 15;

  return clampScore(textScore + accentScore + secondaryScore);
}

// Looks at hue relationships between background, accent, and secondary colors to ensure the hues work together
function scoreHarmony(palette: PaletteCandidate): number {
  const hues = [
    palette.backgroundColor,
    palette.accentColor,
    palette.secondaryColor,
  ].map((color) => rgbToHsl(hexToRgb(color)).h);

  const distances = [
    hueDistance(hues[0], hues[1]),
    hueDistance(hues[0], hues[2]),
    hueDistance(hues[1], hues[2]),
  ];

  const bestDistances = distances.map((distance) => {
    const analogous = Math.max(0, 1 - Math.abs(distance - 30) / 35);
    const complementary = Math.max(0, 1 - Math.abs(distance - 180) / 35);
    const triadic = Math.max(0, 1 - Math.abs(distance - 120) / 35);
    const monochromatic = Math.max(0, 1 - distance / 18);
    return Math.max(analogous, complementary, triadic, monochromatic);
  });

  return clampScore(
    (bestDistances.reduce((sum, score) => sum + score, 0) /
      bestDistances.length) *
    100,
  );
}

// Scores how well a palette's BACKGROUND matches the requested background target.
function scoreBackgroundMatch(
  palette: PaletteCandidate,
  target: MoodProfile["backgroundTarget"],
): number {
  const bg = rgbToHsl(hexToRgb(palette.backgroundColor));
  const targetLightness = target.lightness === "light" ? 0.9 : target.lightness === "dark" ? 0.18 : 0.55;

  const lightnessScore =
    1 - Math.abs(bg.l - targetLightness);
  const saturationScore =
    1 - Math.abs(bg.s - targetValue(target.saturation));
  const hueScore =
    target.hue === null
      ? 0.7
      : 1 - Math.min(hueDistance(bg.h, target.hue) / 120, 1);

  return clampScore(
    (hueScore * 0.5 + lightnessScore * 0.3 + saturationScore * 0.2) * 100,
  );
}

// When the user named a color/mood, accent/CTA hues should stay in that family — not literal topic colors.
function scoreAccentMatch(
  palette: PaletteCandidate,
  target: MoodProfile["backgroundTarget"],
): number {
  const accentHue = rgbToHsl(hexToRgb(palette.accentColor)).h;
  const anchorHue =
    target.hue ?? rgbToHsl(hexToRgb(palette.backgroundColor)).h;
  const distance = hueDistance(accentHue, anchorHue);
  const sameFamily = Math.max(0, 1 - distance / 50);

  return clampScore(sameFamily * 100);
}

// Blends background match, accent match, and general mood scores.
function scoreMoodMatch(
  palette: PaletteCandidate,
  moodProfile: MoodProfile,
): number {
  const backgroundMatch = scoreBackgroundMatch(
    palette,
    moodProfile.backgroundTarget,
  );

  const briefMatch = moodProfile.backgroundTarget.explicit
    ? clampScore(
      backgroundMatch * 0.65 +
      scoreAccentMatch(palette, moodProfile.backgroundTarget) * 0.35,
    )
    : backgroundMatch;

  const stats = colorStats(getPaletteColors(palette));
  const saturationScore =
    1 - Math.abs(stats.avgSaturation - targetValue(moodProfile.saturation));
  const brightnessScore =
    1 - Math.abs(stats.avgLightness - targetValue(moodProfile.brightness));
  const generalMood = clampScore(
    (saturationScore * 0.5 + brightnessScore * 0.5) * 100,
  );

  const weight = moodProfile.backgroundTarget.explicit ? 0.8 : 0.5;

  return clampScore(briefMatch * weight + generalMood * (1 - weight));
}

function paletteDistance(a: PaletteCandidate, b: PaletteCandidate): number {
  const statsA = colorStats(getPaletteColors(a));
  const statsB = colorStats(getPaletteColors(b));

  const hue = hueDistance(statsA.avgHue, statsB.avgHue) / 180;
  const saturation = Math.abs(statsA.avgSaturation - statsB.avgSaturation);
  const lightness = Math.abs(statsA.avgLightness - statsB.avgLightness);
  const contrast = Math.abs(
    contrastRatio(a.backgroundColor, a.primaryTextColor) / 21 -
    contrastRatio(b.backgroundColor, b.primaryTextColor) / 21,
  );

  return hue * 0.4 + saturation * 0.2 + lightness * 0.2 + contrast * 0.2;
}

// Among the 5–10 AI-generated palettes, this rewards options that are different from the others by looking at average hue, saturation, lightness, and contrast
function scoreDiversity(
  palette: PaletteCandidate,
  palettes: PaletteCandidate[],
): number {
  const others = palettes.filter((other) => other !== palette);
  if (others.length === 0) return 100;

  const avgDistance =
    others.reduce((sum, other) => sum + paletteDistance(palette, other), 0) /
    others.length;

  return clampScore(Math.min(avgDistance / 0.55, 1) * 100);
}

function normalizeBackgroundStyle(
  style: BackgroundStyle,
  fallbackColor: string,
): BackgroundStyle {
  const colors = style.colors
    .map((color) => normalizeHex(color, fallbackColor))
    .filter((color, index, list) => list.indexOf(color) === index);

  return {
    type: style.type,
    direction:
      style.type === "solid"
        ? null
        : style.direction === "diagonal"
          ? "diagonal-tl-br"
          : (style.direction ??
            (style.type === "gradient" ? "vertical" : "horizontal")),
    colors: colors.length > 0 ? colors : [fallbackColor],
  };
}

// Ensures all colors are in the correct format and returns a fallback if the input is invalid
function normalizePalette(
  palette: PaletteCandidate,
  index: number,
): PaletteCandidate {
  const backgroundColor = normalizeHex(
    palette.backgroundColor,
    FALLBACK_RESULT.palettes[index % FALLBACK_RESULT.palettes.length]
      .backgroundColor,
  );

  return {
    name: palette.name,
    backgroundColor,
    primaryTextColor: normalizeHex(palette.primaryTextColor, "#111827"),
    accentColor: normalizeHex(palette.accentColor, "#2563EB"),
    secondaryColor: normalizeHex(palette.secondaryColor, "#93C5FD"),
    neutralColors: palette.neutralColors
      .slice(0, 4)
      .map((color) => normalizeHex(color, "#E5E7EB")),
    backgroundStyle: normalizeBackgroundStyle(
      palette.backgroundStyle,
      backgroundColor,
    ),
  };
}

function scorePalettes(
  palettes: PaletteCandidate[],
  moodProfile: MoodProfile,
): ScoredPalette[] {
  // Diversity must never override an explicit request 
  // Keep its weight small, and smaller still when the user named a specific color/mood.
  const diversityWeight = moodProfile.backgroundTarget.explicit ? 0.05 : 0.15;
  const moodWeight = moodProfile.backgroundTarget.explicit ? 0.5 : 0.35;
  const contrastWeight = 0.25;
  const harmonyWeight = 1 - diversityWeight - moodWeight - contrastWeight;

  return palettes
    .map((palette, index) => {
      const contrast = scoreContrast(palette);
      const harmony = scoreHarmony(palette);
      const moodMatch = scoreMoodMatch(palette, moodProfile);
      const diversity = scoreDiversity(palette, palettes);
      const total = clampScore(
        (contrast * contrastWeight) +
        (harmony * harmonyWeight) +
        (moodMatch * moodWeight) +
        (diversity * diversityWeight),
      );

      return {
        ...palette,
        id: `palette-${index + 1}`,
        scores: {
          contrast,
          harmony,
          moodMatch,
          diversity,
          total,
        },
      };
    })
    .sort((a, b) => b.scores.total - a.scores.total);
}

// Picks the final shown palettes so they are both high-scoring AND visibly different from each other. 
function selectDiversePalettes(
  scored: ScoredPalette[],
  count: number,
): ScoredPalette[] {
  if (scored.length <= count) return scored;

  // Only consider strong candidates so a weird outlier can't win on distance.
  const pool = scored.slice(0, Math.min(scored.length, Math.max(count * 2, 6)));
  const selected: ScoredPalette[] = [pool[0]];
  const diversityBonus = 120;

  while (selected.length < count) {
    let best: ScoredPalette | null = null;
    let bestValue = -Infinity;

    for (const candidate of pool) {
      if (selected.includes(candidate)) continue;

      const minDistance = Math.min(
        ...selected.map((chosen) => paletteDistance(candidate, chosen)),
      );
      const value = candidate.scores.total + minDistance * diversityBonus;

      if (value > bestValue) {
        bestValue = value;
        best = candidate;
      }
    }

    if (!best) break;
    selected.push(best);
  }

  return selected;
}

function backgroundDirectionToAngle(
  direction: BackgroundStyle["direction"],
): number {
  switch (direction) {
    case "horizontal":
      return 90;
    case "diagonal-tl-br":
      return 135;
    case "diagonal-tr-bl":
      return 45;
    case "vertical":
    default:
      return 180;
  }
}

export function toDesignPalette(palette: PaletteCandidate): Palette {
  return {
    background: palette.backgroundColor,
    text: palette.primaryTextColor,
    accent: palette.accentColor,
    secondary: palette.secondaryColor,
    // First neutral is the most muted supporting tone; fall back to secondary.
    neutral: palette.neutralColors[0] ?? palette.secondaryColor,
  };
}

export function formatPaletteBrief(palette: PaletteCandidate): string {
  const { backgroundStyle } = palette;
  let backgroundInstruction: string;

  if (backgroundStyle.type === "solid") {
    backgroundInstruction =
      'Use setSolidBackground with color "background" on every slide.';
  } else if (backgroundStyle.type === "gradient") {
    const [from, to] = backgroundStyle.colors;
    const angle = backgroundDirectionToAngle(backgroundStyle.direction);
    backgroundInstruction =
      `Use setGradientBackground on every slide with from "${from}" (or token "background"), to "${to}" (or secondary ${palette.secondaryColor}), angle ${angle}.`;
  } else {
    const angle = backgroundDirectionToAngle(backgroundStyle.direction);
    backgroundInstruction =
      `Stripes are not supported — approximate with setGradientBackground using ${backgroundStyle.colors.join(" → ")} at angle ${angle}, or setSolidBackground with "background".`;
  }

  return `

PRE-SELECTED COLOR PALETTE (mandatory — call setPalette with these EXACT hex values on every slide; do not invent different colors):
- background: ${palette.backgroundColor}
- text: ${palette.primaryTextColor}
- accent: ${palette.accentColor}
- secondary (shapes/dividers): ${palette.secondaryColor}
- neutrals: ${palette.neutralColors.join(", ")}
Palette name: "${palette.name}"

BACKGROUND TREATMENT: ${backgroundInstruction}
Reuse this same palette and background approach across all carousel slides unless the brief explicitly asks for per-slide color changes.`;
}

async function generateColourOptions(prompt: string) {
  const result = await generateText({
    model: openai("gpt-5.2"),
    system: `You generate color directions for a free social media design tool.

The user will provide a prompt for an Instagram carousel or a desired color vibe. Create one fixed-template intro slide and 5 to 10 candidate color palettes.

Parse these color roles:
- Background color: the main canvas color or background treatment.
- Primary text color: headings and body text with strong contrast.
- Accent color: highlights, buttons, key words, or callouts.
- Secondary/supporting color: icons, badges, dividers, or subtle emphasis.
- Neutral colors: borders, muted text, soft card backgrounds, or disabled states.

Rules:
- Follow explicit color requests when present, and treat them as a hard constraint on the BACKGROUND and on accent/CTA colors.
- If the user names a background color or color mood (e.g. "soothing blue", "fiery orange", "sky colors"), set moodProfile.backgroundTarget.explicit to true and make EVERY candidate background honor it. Vary lightness, treatment, secondary, and neutrals within that same color family.
- Even when constrained to one color family, make the candidates clearly DISTINCT from each other: spread them across light/medium/dark backgrounds and low/medium/high saturation, and vary accent pairings and background treatment. Avoid returning several near-identical palettes.
- When backgroundTarget.explicit is true, accent and secondary colors must harmonize with the requested color family (analogous hues within ~50 degrees, or deeper/more saturated variants of the background hue). Do NOT default accent to literal topic colors (e.g. yellow for bees, icy blue for polar bears) when that conflicts with the requested mood.
- When no color is explicitly requested, topic-driven accent colors are fine.
- Map descriptive words accurately in backgroundTarget:
  - "soothing", "soft", "calm", "pastel", "gentle" => lightness: light, saturation: low
  - "fiery", "vibrant", "bold", "electric", "neon" => saturation: high
  - "midnight", "dark", "moody", "deep" => lightness: dark
  - Set backgroundTarget.hue to the requested hue (blue ~210, orange ~30, green ~135, red ~0, purple ~280) or null when no color is implied.
- A "soothing blue" background should be a light, low-saturation blue (like #DCEBFB), NOT a dark navy.
- If no color is mentioned, set explicit to false and infer colors from the topic and vibe.
- Choose the backgroundStyle that best fits the prompt: solid, gradient, or stripes.
- For gradient or stripe backgroundStyles, infer direction from the user's wording and set backgroundStyle.direction to one of: vertical, horizontal, diagonal-tl-br, diagonal-tr-bl.
- For STRIPES, map axis wording to direction like this:
  - horizontal: "horizontal stripes", "left to right", "right to left", "sideways", "across", "side to side". These mean bands run horizontally (parallel to the top/bottom edge). "Right to left" is horizontal, NOT diagonal.
  - vertical: "vertical stripes", "top to bottom", "bottom to top", "up and down", "upward", "downward".
  - diagonal-tl-br: only when the user clearly wants angled bands like \ (e.g. "diagonal", "top-left to bottom-right", "corner to corner" with those corners).
  - diagonal-tr-bl: only when the user clearly wants angled bands like / (e.g. "top-right to bottom-left").
  - Do NOT use a diagonal direction just because the user said "right to left" or "left to right" without also implying an angle or diagonal/corner wording.
- For GRADIENTS: horizontal = left-to-right flow; vertical = top-to-bottom flow; diagonal-tl-br = color flows top-left toward bottom-right; diagonal-tr-bl = color flows top-right toward bottom-left.
- Use the same intro slide structure every time: short eyebrow, bold headline, useful subtext, short CTA.
- Keep fonts out of the response.
- Return only hex colors in #RRGGBB format.
- Primary text must contrast strongly with the background (meet WCAG AA 4.5:1).
- When a background color is requested, keep backgrounds AND accents within that color family; differ them by lightness, saturation, and treatment rather than switching to unrelated topic hues.
- Do not mention scores; scoring is handled by code.`,
    messages: [{ role: "user", content: prompt }],
    experimental_output: Output.object({
      schema: colourGeneratorSchema,
    }),
  });

  return result.output ?? FALLBACK_RESULT;
}

export async function generateColourPalette(
  prompt: string,
): Promise<ColourPaletteResult> {
  let generated;
  try {
    generated = await generateColourOptions(prompt);
  } catch (error) {
    console.warn("Colour model failed, using fallback palettes", error);
    generated = FALLBACK_RESULT;
  }

  const normalizedPalettes = generated.palettes.map((palette, index) =>
    normalizePalette(palette, index),
  );
  const scoredPalettes = scorePalettes(
    normalizedPalettes,
    generated.moodProfile,
  );
  const palettes = selectDiversePalettes(scoredPalettes, 3).map(
    (palette, index) => ({
      ...palette,
      id: `palette-${index + 1}`,
    }),
  );
  const selectedPalette = palettes[0] ?? {
    ...normalizePalette(FALLBACK_RESULT.palettes[0], 0),
    id: "palette-1",
    scores: {
      contrast: 0,
      harmony: 0,
      moodMatch: 0,
      diversity: 0,
      total: 0,
    },
  };

  return {
    slide: generated.slide,
    moodProfile: generated.moodProfile,
    palettes,
    selectedPalette,
    selectedPaletteId: selectedPalette.id,
  };
}
