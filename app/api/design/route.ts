import { examples } from "@/exa";
import { generateImage, type ImageAspect } from "@/lib/gemini";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ImageElementSchema,
  PaletteSchema,
  ShapeElementSchema,
  TextElementSchema,
} from "@/lib/schema";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ModelMessage } from "ai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

// Image generation can take a while; allow a generous budget.
export const maxDuration = 120;

const MODEL = process.env.DESIGN_MODEL ?? "claude-sonnet-4-6";

// Some environments export ANTHROPIC_BASE_URL without the trailing "/v1"
// (e.g. "https://api.anthropic.com"), which makes the SDK request
// ".../messages" and 404. Normalize it so it always ends in "/v1".
function normalizedBaseURL(): string | undefined {
  const raw = process.env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "");
  if (!raw) return undefined;
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

const anthropic = createAnthropic({ baseURL: normalizedBaseURL() });

const SYSTEM_PROMPT = `You are an expert social-media carousel slide designer. Given a brief, you design ONE Instagram carousel slide on a fixed ${CANVAS_WIDTH}x${CANVAS_HEIGHT} canvas (portrait 4:5).

Build the slide by calling tools in this strict order:
1. setPalette — call this FIRST with concrete hex values.
2. setSolidBackground / setGradientBackground / setImageBackground — call exactly ONE to define the slide background.
3. For each visual element (top-to-bottom), call addTextElement, addShapeElement, or addImageElement ONCE per element.
4. If a photo/image is needed: call generateImage FIRST to get an imageId, THEN call addImageElement (or setImageBackground) referencing that imageId.

CANVAS & MARGINS
- All coordinates and sizes are px within the ${CANVAS_WIDTH}x${CANVAS_HEIGHT} canvas.
- Keep ALL content inside a safe area: x from 80 to 1000, y from 80 to 1270. Never let an element extend past these bounds.

FONT SIZES (keep them modest — oversized text overflows and overlaps)
- Headline: 56-92. Use the SMALLER end for longer headlines so the whole headline fits on 1-2 lines. Never exceed 96.
- Sub-headline: 48-64. Small callout / CTA label: 32-48.

NO OVERLAP — lay elements out top-to-bottom (this is the most important rule)
- Estimate each text element's wrapped height: linesApprox = ceil(content.length * fontSize * 0.5 / width); height ≈ linesApprox * fontSize * lineHeight (+ 2*paddingY if it has a pill background).
- Stack elements vertically: each element's y MUST be >= the previous element's (y + estimated height) + a gap. Text elements must NOT overlap each other.
- Use a tight gap of 12-24px between a heading and its subtitle (the subtitle should sit noticeably closer to the headline than other elements).
- Use a generous gap of 40-60px between all other stacked elements (eyebrow → heading, subtitle → callout/CTA, text blocks → images, etc.).
- Make text element 'width' wide enough (often 800-920) so headlines wrap to few lines. Verify y + estimatedHeight <= 1270 for every element.
- Shapes must NEVER overlap or sit behind text. Use shapes only for decorative dividers, accent bars, or standalone badges with no text on top of them.

FOLLOW THE BRIEF LITERALLY
- If the brief specifies exact text for a label, heading, or subtitle, use that text VERBATIM (do not paraphrase or invent a catchier hook). Include every piece the user asked for (e.g. a small top label/eyebrow, the heading, the subtitle).
- If the brief explicitly asks for a picture/photo/image of something (e.g. "put a picture of a smiling lady"), you MUST call the generateImage tool to create it and place it as an image element. If it mentions an arrow pointing at something, either include the arrow in the image prompt or add a small rotated text "→" element near it.

COLOR & FONTS (use SEMANTIC TOKENS so palettes can be swapped)
- Element colors must be one of the tokens "background", "text", or "accent".
- Also set the top-level palette (via setPalette) with concrete hex values for background/text/accent. If the brief specifies colors, map them to the palette (the main surface color → background, the main text color → text, the highlight color → accent). Otherwise choose a tasteful palette fitting the topic.
- Background is usually a solid "background" or a gradient between palette tokens.
- font role "heading" for the display headline; "body" for sub-text, callouts, and CTAs.

EMPHASIZING WORDS — use inline segments, never multiple elements
- To color one or more words of a headline in the accent color, use a SINGLE addElement call with the 'segments' array (inline colored runs). Set the element 'color' to the base color and override individual runs with "accent".
- Example: content "From $0 to $300K MRR", segments: [{text:"From "},{text:"$0",color:"accent"},{text:" to "},{text:"$300K MRR",color:"accent"}].
- DO NOT create multiple overlapping text elements to color different words.

TEXT BACKGROUNDS — ALWAYS use the text element's own background field, never a shape
- To put a colored pill or box behind text, set the text element's "background" color token, paddingX, paddingY, and borderRadius. The renderer wraps the background tightly around the text, keeping it perfectly centered.
- NEVER place a shape element behind a text element to fake a background. This causes misalignment and overlap.

CTA BUTTONS — compact accent pills with dark text (match this style exactly)
- Use a text element with background:"accent", color:"text" (dark text on a bright accent — NEVER color:"background" on CTAs).
- Shape: stadium/pill — borderRadius 40-999, flat (no shadow/border).
- Typography: font "body", fontSize 36-44, fontWeight 400-500, align "center", short label (e.g. "Start", "Swipe →").
- Padding: generous horizontal (paddingX 48-64), modest vertical (paddingY 14-18) — roughly 3:1 horizontal-to-vertical ratio.
- Size the element width to fit the label + padding (typically 200-320px), NOT full-width. Center on canvas (x ≈ (1080 − width) / 2).
- Place near the bottom (y ≈ 1100-1220) with 40-60px gap above the preceding element.
- Example CTA: { kind:"text", content:"Start", font:"body", fontSize:40, fontWeight:500, color:"text", align:"center", background:"accent", paddingX:56, paddingY:16, borderRadius:999, width:260, x:410, y:1150 }

SMALL LABELS / EYEBROWS — use accent pills with light text (different from CTAs)
- Example chip: { kind:"text", background:"accent", paddingX:22, paddingY:10, borderRadius:32, color:"background", fontSize:26, ... }

ELEMENTS
- text: headline, optional sub-headline, optional small italic callout, CTA chip. Use the text element's "background" field for any colored pill behind it.
- image: use the generateImage tool first, then reference it by the returned imageId. Person cutouts read well anchored to a bottom corner; keep text clear of the image area.
- shape: rect/pill/circle ONLY for standalone decorative elements — accent bars, dividers, badges with no text on top.
- don't use too many dividers, use them sparingly.

COPYWRITING
- Write punchy slide copy from the brief (a hook headline + a short supporting line is typical).
- IMPORTANT: write the copy in the SAME LANGUAGE as the user's brief.

IMAGES
- Only call generateImage when the design genuinely needs a photo. Many strong slides are pure type on a solid/gradient background — don't force an image. At most 2 images.

TOOL CALLING — IMPORTANT
- Do NOT output any JSON or plain text. Use tools EXCLUSIVELY to build the slide.
- Always call setPalette → one background tool → element tools in that order.
- Use addTextElement for text, addShapeElement for shapes, addImageElement for photos.
- NEVER use a shape as a text background. Use the text element's own "background" + paddingX/paddingY/borderRadius fields instead.`;

// ---------------------------------------------------------------------------
// Streaming event types emitted as NDJSON lines to the client.
// ---------------------------------------------------------------------------

// Inline background shapes to avoid discriminated-union JSON Schema issues.
type SolidBg = { type: "solid"; color: string };
type GradientBg = { type: "gradient"; from: string; to: string; angle: number };
type ImageBg = {
  type: "image";
  imageId: string;
  fit: "cover" | "contain";
  overlay?: string;
  overlayOpacity: number;
};

export type DesignEvent =
  | { type: "palette"; data: z.infer<typeof PaletteSchema> }
  | { type: "background"; data: SolidBg | GradientBg | ImageBg }
  | { type: "element"; data: z.infer<typeof TextElementSchema> | z.infer<typeof ImageElementSchema> | z.infer<typeof ShapeElementSchema> }
  | {
    type: "image";
    data: { imageId: string; dataUrl: string; prompt: string };
  }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Build few-shot messages from the examples. Each tool call becomes an
 * assistant "tool-call" part immediately followed by a "tool" result turn,
 * mirroring the real multi-step conversation the model will produce.
 */
function buildFewShotMessages(): ModelMessage[] {
  const messages: ModelMessage[] = [];

  for (const ex of examples) {
    messages.push({ role: "user", content: ex.brief });

    for (let i = 0; i < ex.toolCalls.length; i++) {
      const tc = ex.toolCalls[i];
      const id = `fs_${i}`;
      messages.push({
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: id, toolName: tc.tool, input: tc.args },
        ],
      });
      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: id,
            toolName: tc.tool,
            output: { type: "text", value: JSON.stringify({ ok: true }) },
          },
        ],
      });
    }
  }

  return messages;
}

const FEW_SHOT_MESSAGES = buildFewShotMessages();

export async function POST(request: Request) {
  let prompt: string;
  try {
    const body = await request.json();
    prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!prompt) {
    return Response.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: DesignEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      const images = new Map<string, { dataUrl: string; prompt: string }>();
      let imageCounter = 0;

      try {
        await generateText({
          model: anthropic(MODEL),
          system: SYSTEM_PROMPT,
          messages: [
            ...FEW_SHOT_MESSAGES,
            { role: "user", content: prompt },
          ],
          tools: {
            // ── Image generation ──────────────────────────────────────────
            generateImage: tool({
              description:
                "Generate a photographic image (person cutout, product, or background) for the slide. Call this BEFORE the addImageElement that references the imageId.",
              inputSchema: z.object({
                prompt: z
                  .string()
                  .describe("Detailed description of the image to generate."),
                aspect: z
                  .enum(["portrait", "landscape", "square"])
                  .default("portrait")
                  .describe("Aspect ratio of the image."),
              }),
              execute: async ({ prompt: imagePrompt, aspect }) => {
                const id = `img_${++imageCounter}`;
                try {
                  const { dataUrl } = await generateImage(
                    imagePrompt,
                    aspect as ImageAspect,
                  );
                  images.set(id, { dataUrl, prompt: imagePrompt });
                  emit({
                    type: "image",
                    data: { imageId: id, dataUrl, prompt: imagePrompt },
                  });
                  return { imageId: id };
                } catch (err) {
                  return {
                    error:
                      err instanceof Error
                        ? err.message
                        : "Image generation failed",
                  };
                }
              },
            }),

            // ── Palette ───────────────────────────────────────────────────
            setPalette: tool({
              description:
                "Set the slide color palette. Call this FIRST — before any background or element tool.",
              inputSchema: PaletteSchema,
              execute: async (palette) => {
                emit({ type: "palette", data: palette });
                return { ok: true };
              },
            }),

            // ── Background (split into three concrete tools to avoid       ──
            // ── discriminated-union JSON Schema issues with the Anthropic  ──
            // ── API which requires input_schema.type = "object".           ──
            setSolidBackground: tool({
              description:
                'Set a solid-color background. Call after setPalette. Use color token "background" for the palette background color.',
              inputSchema: z.object({
                color: z
                  .string()
                  .describe(
                    'Semantic token ("background", "text", or "accent") or a hex color.',
                  ),
              }),
              execute: async ({ color }) => {
                emit({ type: "background", data: { type: "solid", color } });
                return { ok: true };
              },
            }),

            setGradientBackground: tool({
              description:
                "Set a gradient background. Call after setPalette. Use semantic tokens for from/to.",
              inputSchema: z.object({
                from: z
                  .string()
                  .describe("Start color (token or hex)."),
                to: z.string().describe("End color (token or hex)."),
                angle: z
                  .number()
                  .default(180)
                  .describe("Gradient angle in degrees (180 = top-to-bottom)."),
              }),
              execute: async ({ from, to, angle }) => {
                emit({
                  type: "background",
                  data: { type: "gradient", from, to, angle },
                });
                return { ok: true };
              },
            }),

            setImageBackground: tool({
              description:
                "Set a full-bleed image background. Call generateImage first to get the imageId.",
              inputSchema: z.object({
                imageId: z
                  .string()
                  .describe("Id returned by generateImage."),
                fit: z.enum(["cover", "contain"]).default("cover"),
                overlay: z
                  .string()
                  .optional()
                  .describe("Optional color overlay token or hex for legibility."),
                overlayOpacity: z
                  .number()
                  .min(0)
                  .max(1)
                  .default(0.3)
                  .describe("Overlay opacity 0-1."),
              }),
              execute: async ({ imageId, fit, overlay, overlayOpacity }) => {
                emit({
                  type: "background",
                  data: { type: "image", imageId, fit, overlay, overlayOpacity },
                });
                return { ok: true };
              },
            }),

            // ── Elements (split by kind for the same reason) ──────────────
            addTextElement: tool({
              description:
                "Add a text element (headline, sub-headline, callout, CTA chip) to the slide. Call once per element, top-to-bottom.",
              inputSchema: TextElementSchema,
              execute: async (element) => {
                emit({ type: "element", data: element });
                return { ok: true };
              },
            }),

            addImageElement: tool({
              description:
                "Add a photo/image element to the slide. Call generateImage first to get the imageId.",
              inputSchema: ImageElementSchema,
              execute: async (element) => {
                emit({ type: "element", data: element });
                return { ok: true };
              },
            }),

            addShapeElement: tool({
              description:
                "Add a shape (rect, pill, or circle) to the slide — accent bars, dividers, badges.",
              inputSchema: ShapeElementSchema,
              execute: async (element) => {
                emit({ type: "element", data: element });
                return { ok: true };
              },
            }),
          },
          // palette + background + up to ~12 elements + up to 2 images
          // (each needing a generateImage call before addImageElement).
          stopWhen: stepCountIs(30),
        });

        emit({ type: "done" });
      } catch (err) {
        console.error("design generation failed", err);
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
