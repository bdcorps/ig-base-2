import { examples } from "@/exa";
import {
  formatPaletteBrief,
  generateColourPalette,
  toDesignPalette,
} from "@/lib/colorGenerator";
import { assembleDesignFromEvents } from "@/lib/designAssembly";
import type { DesignEvent, UserImageInput } from "@/lib/designEvents";
import { generateImage, generateSticker, type ImageAspect } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ImageElementSchema,
  PaletteSchema,
  ShapeElementSchema,
  StackElementSchema,
  TextElementSchema,
  type PaletteOption,
} from "@/lib/schema";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ModelMessage } from "ai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const MODEL = process.env.DESIGN_MODEL ?? "gemini-2.5-pro";

const STYLE_REFERENCE_IMAGE_URL =
  "https://i.ibb.co/zTsXjPG1/Clean-Shot-2026-06-20-at-20-50-57.png";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert social-media carousel slide designer. Given a brief, you design a complete Instagram carousel — MULTIPLE slides on a fixed ${CANVAS_WIDTH}x${CANVAS_HEIGHT} canvas (portrait 4:5).

CAROUSEL STRUCTURE
- Design every slide the brief calls for (typically 3-8 slides). If a slide count is specified, match it exactly.
- Typical flow: hook slide → 2-5 content/tip slides → optional CTA/closing slide.
- Keep a cohesive visual system across slides: reuse the same palette tokens and font roles; vary layout and copy per slide.
- Each slide is independent — call startSlide before building each one.

Build EACH slide by calling tools in this strict order:
1. startSlide — call FIRST for every slide (slideNumber 1, 2, 3, …).
2. setPalette — call with concrete hex values (reuse the same palette across slides unless the brief asks otherwise).
3. setSolidBackground / setGradientBackground / setImageBackground — call exactly ONE to define the slide background.
4. For each visual element (top-to-bottom), call addStackElement, addTextElement, addShapeElement, or addImageElement ONCE per element.
5. If a photo/image is needed: call generateImage FIRST to get an imageId, THEN call addImageElement (or setImageBackground) referencing that imageId.
6. If a sticker/cutout/illustration with transparent background is needed: call generateSticker FIRST to get an imageId, THEN call addImageElement with fit:"contain".

CANVAS & MARGINS
- All coordinates and sizes are px within the ${CANVAS_WIDTH}x${CANVAS_HEIGHT} canvas.
- Keep ALL content inside a safe area: x from 80 to 1000, y from 80 to 1270. Never let an element extend past these bounds.

FONT SIZES (keep them modest — oversized text overflows and overlaps)
- Headline: 56-92. Use the SMALLER end for longer headlines so the whole headline fits on 1-2 lines. Never exceed 96.
- Sub-headline: 48-64. Small callout / CTA label: 32-48.
- Headings (font role "heading"): fontWeight 400-500 ONLY. Never use bold or heavy weights (600, 700, etc.) — hierarchy comes from size and color, not weight.

NO OVERLAP — lay elements out top-to-bottom
- Prefer addStackElement for vertically grouped content (eyebrow + headline + subtitle, headline + CTA, icon row, etc.). The stack handles spacing and cross-axis alignment — do NOT manually compute x/y for each child inside a stack.
- Stack layout: set stack x/y/width once (often x:80, width:920). Use direction:"column", alignItems:"center" to center children of different widths on the same axis. Use alignItems:"stretch" when children should fill the stack width. Use gap:12-24 between headline and subtitle, gap:40-60 before images or CTAs.
- Stack children omit x, y, and rotation — only the stack itself is positioned on the canvas.
- For standalone elements (corner stickers, full-width images, decorative shapes), use addTextElement / addImageElement / addShapeElement with absolute x/y.
- When NOT using a stack, estimate each text element's wrapped height: linesApprox = ceil(content.length * fontSize * 0.5 / width); height ≈ linesApprox * fontSize * lineHeight (+ 2*paddingY if it has a pill background).
- Stack elements vertically when not grouped: each element's y MUST be >= the previous element's (y + estimated height) + a gap. Text elements must NOT overlap each other.
- Use a tight gap of 12-24px between a heading and its subtitle (the subtitle should sit noticeably closer to the headline than other elements).
- Use a generous gap of 40-60px between all other stacked elements (eyebrow → heading, subtitle → callout/CTA, text blocks → images, etc.).
- Make text element 'width' wide enough (often 800-920) so headlines wrap to few lines. Verify y + estimatedHeight <= 1270 for every element.
- Shapes must NEVER overlap or sit behind text. Use shapes only for decorative dividers, accent bars, or standalone badges with no text on top of them.

FOLLOW THE BRIEF LITERALLY
- If the brief specifies exact text for a label, heading, or subtitle, use that text VERBATIM (do not paraphrase or invent a catchier hook). Include every piece the user asked for (e.g. a small top label/eyebrow, the heading, the subtitle).
- If the brief explicitly asks for a picture/photo/image of something (e.g. "put a picture of a smiling lady"), you MUST call the generateImage tool to create it and place it as an image element. If it mentions an arrow pointing at something, either include the arrow in the image prompt or add a small rotated text "→" element near it.
- If the brief asks for a sticker, emoji-style icon, cutout, or illustration that should float over the slide (transparent background), call generateSticker — NOT generateImage. Place with addImageElement and fit:"contain".

COLOR & FONTS (use SEMANTIC TOKENS so palettes can be swapped)
- Element colors must be one of the tokens "background", "text", or "accent".
- Also set the top-level palette (via setPalette) with concrete hex values for background/text/accent. If the brief specifies colors, map them to the palette (the main surface color → background, the main text color → text, the highlight color → accent). Otherwise choose a tasteful palette fitting the topic.
- Background is usually a solid "background" or a gradient between palette tokens.
- font role "heading" for the display headline (fontWeight 400-500); "body" for sub-text, callouts, and CTAs.

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
- Size the element width to fit the label + padding (typically 200-320px), NOT full-width. Inside a stack, use alignItems:"center" — do NOT compute x manually.
- Place near the bottom (y ≈ 1100-1220) with 40-60px gap above the preceding element, or include the CTA as the last child of a content stack.
- Example CTA inside a stack child: { kind:"text", content:"Start", font:"body", fontSize:40, fontWeight:500, color:"text", align:"center", background:"accent", paddingX:56, paddingY:16, borderRadius:999, width:260 }

SMALL LABELS / EYEBROWS — use accent pills with light text (different from CTAs)
- Example chip: { kind:"text", background:"accent", paddingX:22, paddingY:10, borderRadius:32, color:"background", fontSize:26, ... }

ELEMENTS
- stack: flex container for grouped content. Use for eyebrow + headline + subtitle, headline + CTA, or any set of elements that should share alignment. Children are text/image/shape objects WITHOUT x/y.
- text: headline, optional sub-headline, optional small italic callout, CTA chip. Use the text element's "background" field for any colored pill behind it.
- image: use generateImage for photos/backgrounds, or generateSticker for transparent cutouts/stickers. Person cutouts read well anchored to a bottom corner; keep text clear of the image area. Stickers MUST use fit:"contain".
- shape: rect/pill/circle ONLY for standalone decorative elements — accent bars, dividers, badges with no text on top.
- don't use too many dividers, use them sparingly.

COPYWRITING
- Write punchy slide copy from the brief (a hook headline + a short supporting line is typical).
- IMPORTANT: write the copy in the SAME LANGUAGE as the user's brief.

IMAGES & STICKERS
- generateImage: photographic images and full-bleed backgrounds.
- generateSticker: isolated subjects with transparent background (person cutouts, emoji-style icons, decorative stickers). Always place stickers with fit:"contain".
- Only call image tools when the design genuinely needs them. Many strong slides are pure type — don't force images. At most 2 images/stickers combined.

TOOL CALLING — IMPORTANT
- Do NOT output any JSON or plain text. Use tools EXCLUSIVELY to build the carousel.
- For each slide: startSlide → setPalette → one background tool → element tools in that order.
- Use addStackElement for grouped vertical/horizontal content, addTextElement for standalone text, addShapeElement for shapes, addImageElement for photos.
- NEVER use a shape as a text background. Use the text element's own "background" + paddingX/paddingY/borderRadius fields instead.
- Finish ALL slides before stopping — do not stop after the first slide.`;

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

export type DesignEventHandler = (event: DesignEvent) => void;

export interface RunDesignGenerationOptions {
  prompt: string;
  userImages?: UserImageInput[];
  slideCount?: number;
  onEvent: DesignEventHandler;
}

export interface RunDesignGenerationResult {
  slideCount: number;
  paletteOptions: PaletteOption[];
}

export async function runDesignGeneration(
  opts: RunDesignGenerationOptions,
): Promise<RunDesignGenerationResult> {
  const { prompt, userImages = [], slideCount, onEvent } = opts;

  const promptId = crypto.randomUUID();
  let savedPromptId: string | null = null;
  try {
    await prisma.prompt.create({
      data: { id: promptId, prompt },
    });
    savedPromptId = promptId;
  } catch (err) {
    console.warn("failed to save prompt", err);
  }

  const recordedEvents: DesignEvent[] = [];
  const savePromptOutput = async () => {
    if (!savedPromptId) return;
    try {
      const output = assembleDesignFromEvents(recordedEvents);
      await prisma.prompt.update({
        where: { id: savedPromptId },
        data: { output: output as object },
      });
    } catch (err) {
      console.warn("failed to save prompt output", err);
    }
  };

  let enforcedPalette: z.infer<typeof PaletteSchema> | null = null;
  let paletteBrief = "";
  let paletteOptions: PaletteOption[] = [];

  try {
    const colourResult = await generateColourPalette(prompt);
    enforcedPalette = toDesignPalette(colourResult.selectedPalette);
    paletteBrief = formatPaletteBrief(colourResult.selectedPalette);
    paletteOptions = colourResult.palettes.map((palette) => ({
      id: palette.id,
      name: palette.name,
      palette: toDesignPalette(palette),
    }));
  } catch (err) {
    console.warn("colour palette pre-generation failed", err);
  }

  const slideCountNote = slideCount
    ? `\n\nSLIDE COUNT: Design exactly ${slideCount} slides. Call startSlide for slides 1 through ${slideCount}.`
    : "\n\nSLIDE COUNT: Infer the number of slides from the brief (typically 3-8). Call startSlide before each slide.";

  const userImageNote =
    userImages.length > 0
      ? `\n\nUSER-PROVIDED PHOTOS: The user uploaded ${userImages.length} photo(s) pre-registered as ${userImages.map((_, i) => `user_${i + 1}`).join(", ")}. When the design should feature the user's own photos (headshot, product, team, etc.), use addImageElement or setImageBackground with those imageIds directly — do NOT call generateImage for them.`
      : "";

  const emit = (event: DesignEvent) => {
    recordedEvents.push(event);
    onEvent(event);
  };

  const images = new Map<string, { dataUrl: string; prompt: string }>();
  let imageCounter = 0;
  let currentSlideIndex = 0;
  let slideCountEmitted = 0;

  const slideScoped = <T extends Record<string, unknown>>(data: T) => ({
    ...data,
    slideIndex: currentSlideIndex,
  });

  userImages.forEach((img, i) => {
    const id = `user_${i + 1}`;
    const label = img.name?.trim() || `User photo ${i + 1}`;
    images.set(id, { dataUrl: img.dataUrl, prompt: label });
    emit({
      type: "image",
      data: { imageId: id, dataUrl: img.dataUrl, prompt: label },
    });
  });

  if (paletteOptions.length > 0) {
    emit({
      type: "paletteOptions",
      data: {
        palettes: paletteOptions,
        selectedPaletteId: paletteOptions[0]?.id ?? null,
      },
    });
  }

  try {
    await generateText({
      model: gemini(MODEL),
      system: SYSTEM_PROMPT,
      messages: [
        ...FEW_SHOT_MESSAGES,
        // {
        //   role: "user",
        //   content: [
        //     {
        //       type: "image",
        //       image: new URL(STYLE_REFERENCE_IMAGE_URL),
        //     },
        //     {
        //       type: "text",
        //       text:
        //         "Make the carousel like this — copy the style, colors, and fonts from this reference.\n\n" +
        //         prompt +
        //         slideCountNote +
        //         userImageNote +
        //         paletteBrief,
        //     },
        //   ],
        // },
      ],
      tools: {
        startSlide: tool({
          description:
            "Begin a new carousel slide. Call this FIRST before setPalette for each slide (slideNumber 1, 2, 3, …).",
          inputSchema: z.object({
            slideNumber: z
              .number()
              .int()
              .min(1)
              .max(12)
              .describe("1-based slide index in the carousel."),
            role: z
              .string()
              .optional()
              .describe("Optional slide role, e.g. 'hook', 'tip 2', 'CTA'."),
          }),
          execute: async ({ slideNumber, role }) => {
            currentSlideIndex = slideNumber - 1;
            slideCountEmitted = Math.max(slideCountEmitted, slideNumber);
            emit({
              type: "slideStart",
              data: { index: currentSlideIndex, role },
            });
            return { ok: true, slideNumber };
          },
        }),

        generateImage: tool({
          description:
            "Generate a photographic image (person photo, product shot, or full-bleed background) for the slide. Call this BEFORE addImageElement or setImageBackground that references the imageId. Do NOT use for stickers/cutouts — use generateSticker instead.",
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
                  err instanceof Error ? err.message : "Image generation failed",
              };
            }
          },
        }),

        generateSticker: tool({
          description:
            "Generate a sticker/illustration with a transparent background (person cutout, emoji-style icon, decorative sticker). Call BEFORE addImageElement — then place with fit:\"contain\". Do NOT use for full-bleed photo backgrounds.",
          inputSchema: z.object({
            prompt: z
              .string()
              .describe(
                "Detailed description of the sticker subject (isolated, no background scene).",
              ),
            aspect: z
              .enum(["portrait", "landscape", "square"])
              .default("square")
              .describe("Aspect ratio — square works best for most stickers."),
          }),
          execute: async ({ prompt: stickerPrompt, aspect }) => {
            const id = `sticker_${++imageCounter}`;
            try {
              const { dataUrl } = await generateSticker(
                stickerPrompt,
                aspect as ImageAspect,
              );
              images.set(id, { dataUrl, prompt: stickerPrompt });
              emit({
                type: "image",
                data: { imageId: id, dataUrl, prompt: stickerPrompt },
              });
              return { imageId: id };
            } catch (err) {
              return {
                error:
                  err instanceof Error ? err.message : "Sticker generation failed",
              };
            }
          },
        }),

        setPalette: tool({
          description:
            "Set the slide color palette. Call this FIRST — before any background or element tool.",
          inputSchema: PaletteSchema,
          execute: async (palette) => {
            const applied = enforcedPalette ?? palette;
            emit(slideScoped({ type: "palette", data: applied }));
            return { ok: true };
          },
        }),

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
            emit(
              slideScoped({
                type: "background",
                data: { type: "solid", color },
              }),
            );
            return { ok: true };
          },
        }),

        setGradientBackground: tool({
          description:
            "Set a gradient background. Call after setPalette. Use semantic tokens for from/to.",
          inputSchema: z.object({
            from: z.string().describe("Start color (token or hex)."),
            to: z.string().describe("End color (token or hex)."),
            angle: z
              .number()
              .default(180)
              .describe("Gradient angle in degrees (180 = top-to-bottom)."),
          }),
          execute: async ({ from, to, angle }) => {
            emit(
              slideScoped({
                type: "background",
                data: { type: "gradient", from, to, angle },
              }),
            );
            return { ok: true };
          },
        }),

        setImageBackground: tool({
          description:
            "Set a full-bleed image background. Call generateImage first to get the imageId.",
          inputSchema: z.object({
            imageId: z.string().describe("Id returned by generateImage."),
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
            emit(
              slideScoped({
                type: "background",
                data: { type: "image", imageId, fit, overlay, overlayOpacity },
              }),
            );
            return { ok: true };
          },
        }),

        addTextElement: tool({
          description:
            "Add a text element (headline, sub-headline, callout, CTA chip) to the slide. Call once per element, top-to-bottom.",
          inputSchema: TextElementSchema,
          execute: async (element) => {
            emit(slideScoped({ type: "element", data: element }));
            return { ok: true };
          },
        }),

        addImageElement: tool({
          description:
            "Add a photo/image/sticker element to the slide. Call generateImage or generateSticker first to get the imageId. Use fit:\"contain\" for stickers.",
          inputSchema: ImageElementSchema,
          execute: async (element) => {
            emit(slideScoped({ type: "element", data: element }));
            return { ok: true };
          },
        }),

        addShapeElement: tool({
          description:
            "Add a shape (rect, pill, or circle) to the slide — accent bars, dividers, badges.",
          inputSchema: ShapeElementSchema,
          execute: async (element) => {
            emit(slideScoped({ type: "element", data: element }));
            return { ok: true };
          },
        }),

        addStackElement: tool({
          description:
            "Add a flex stack container with aligned children. Use for eyebrow + headline + subtitle, headline + CTA, or any group that should share cross-axis alignment. Children omit x/y/rotation.",
          inputSchema: StackElementSchema,
          execute: async (element) => {
            emit(slideScoped({ type: "element", data: element }));
            return { ok: true };
          },
        }),
      },
      stopWhen: stepCountIs(Math.min(160, 28 + (slideCount ?? 6) * 24)),
    });

    emit({ type: "done", slideCount: Math.max(slideCountEmitted, 1) });
    await savePromptOutput();
  } catch (err) {
    console.error("design generation failed", err);
    emit({
      type: "error",
      message: err instanceof Error ? err.message : "Generation failed",
    });
    await savePromptOutput();
    throw err;
  }

  return {
    slideCount: Math.max(slideCountEmitted, 1),
    paletteOptions,
  };
}
