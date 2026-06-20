import { z } from "zod";

/**
 * The design schema is the single source of truth shared by the agent
 * (structured output) and the renderer (inferred TS types).
 *
 * Colors are SEMANTIC TOKENS ("background" | "text" | "accent") or a raw hex
 * string. Fonts are ROLES ("heading" | "body"). The renderer resolves tokens
 * and roles against the active client-side Theme, so swapping palette/fonts is
 * a pure re-render with no new agent call.
 *
 * The canvas is a fixed 1080x1350; all element coordinates are px in that space.
 */

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

export const ColorSchema = z
  .string()
  .describe(
    'A semantic palette token ("background", "text", or "accent") or a raw hex color like "#ff5500". Prefer tokens so the palette can be swapped.',
  );

export const FontRoleSchema = z
  .enum(["heading", "body"])
  .describe('Which font role to use: "heading" for display text, "body" otherwise.');

const positionFields = {
  x: z.number().describe("Left position in px (0-1080)."),
  y: z.number().describe("Top position in px (0-1350)."),
  width: z.number().describe("Width in px."),
  rotation: z.number().default(0).describe("Rotation in degrees."),
};

export const BackgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: ColorSchema }),
  z.object({
    type: z.literal("gradient"),
    from: ColorSchema,
    to: ColorSchema,
    angle: z.number().default(180).describe("Gradient angle in degrees."),
  }),
  z.object({
    type: z.literal("image"),
    imageId: z.string().describe("Id returned by generateImage or generateSticker."),
    fit: z.enum(["cover", "contain"]).default("cover"),
    overlay: ColorSchema.optional().describe("Optional color overlay for legibility."),
    overlayOpacity: z.number().min(0).max(1).default(0).describe("Overlay opacity 0-1."),
  }),
]);

export const TextSegmentSchema = z.object({
  text: z.string(),
  color: ColorSchema.optional().describe(
    "Optional color override for this run (e.g. \"accent\" to highlight a word). Defaults to the element color.",
  ),
});

export const TextElementSchema = z.object({
  kind: z.literal("text"),
  ...positionFields,
  content: z.string().describe("The full plain text (used when segments are absent)."),
  segments: z
    .array(TextSegmentSchema)
    .optional()
    .describe(
      "Optional inline runs rendered on one line flow, each with its own color. Use this (NOT multiple overlapping text elements) to color individual words of a headline. When present, the concatenation of segment texts should equal content.",
    ),
  font: FontRoleSchema,
  fontSize: z.number().describe("Font size in px (relative to the 1080x1350 canvas)."),
  fontWeight: z.number().default(700),
  color: ColorSchema,
  align: z.enum(["left", "center", "right"]).default("left"),
  italic: z.boolean().default(false),
  uppercase: z.boolean().default(false),
  lineHeight: z.number().default(1.1),
  letterSpacing: z.number().default(0).describe("Letter spacing in px."),
  // Optional pill / highlight background sitting behind the text.
  background: ColorSchema.optional(),
  paddingX: z.number().default(0),
  paddingY: z.number().default(0),
  borderRadius: z.number().default(0),
});

export const ImageElementSchema = z.object({
  kind: z.literal("image"),
  ...positionFields,
  height: z.number(),
  imageId: z.string().describe("Id returned by generateImage or generateSticker."),
  fit: z.enum(["cover", "contain"]).default("cover"),
  borderRadius: z.number().default(0),
});

export const ShapeElementSchema = z.object({
  kind: z.literal("shape"),
  ...positionFields,
  height: z.number(),
  variant: z.enum(["rect", "pill", "circle"]),
  color: ColorSchema,
  borderRadius: z.number().default(0),
});

export const ElementSchema = z.discriminatedUnion("kind", [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
]);

/**
 * What the agent actually generates (structured output). Kept lean — no
 * open-ended `images` record, which otherwise makes Anthropic's structured
 * output grammar compilation time out.
 */
export const PaletteSchema = z.object({
  background: z.string().describe("Background hex color, e.g. \"#a0bcec\"."),
  text: z.string().describe("Primary text hex color."),
  accent: z.string().describe("Accent/highlight hex color."),
});

export const AgentDesignSchema = z.object({
  // Suggested palette applied as the initial theme on the client (still
  // swappable). Maps the design's "background"/"text"/"accent" tokens to colors.
  palette: PaletteSchema.optional(),
  background: BackgroundSchema,
  elements: z.array(ElementSchema),
});

export type AgentDesign = z.infer<typeof AgentDesignSchema>;

/**
 * The full design used by the renderer. `images` is populated server-side after
 * the generateImage / generateSticker tools run (the model only references images by id).
 */
export const SlideDesignSchema = AgentDesignSchema.extend({
  images: z
    .record(
      z.string(),
      z.object({ dataUrl: z.string(), prompt: z.string() }),
    )
    .default({}),
});

export type Color = z.infer<typeof ColorSchema>;
export type FontRole = z.infer<typeof FontRoleSchema>;
export type TextSegment = z.infer<typeof TextSegmentSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type ShapeElement = z.infer<typeof ShapeElementSchema>;
export type SlideElement = z.infer<typeof ElementSchema>;
export type SlideDesign = z.infer<typeof SlideDesignSchema>;

/** Client-side, user-controlled theme. NOT produced by the agent. */
export interface Palette {
  background: string;
  text: string;
  accent: string;
}

export interface Fonts {
  heading: string;
  body: string;
}

export interface Theme {
  palette: Palette;
  fonts: Fonts;
}

export interface PaletteOption {
  id: string;
  name: string;
  palette: Palette;
}

/** Resolve a schema color (token or hex) to a concrete CSS color. */
export function resolveColor(color: Color | undefined, palette: Palette): string | undefined {
  if (color == null) return undefined;
  if (color === "background" || color === "text" || color === "accent") {
    return palette[color];
  }
  return color;
}

/** Resolve a font role to the user-selected Google font family. */
export function resolveFont(role: FontRole, fonts: Fonts): string {
  return fonts[role];
}
