import { generateImage, type ImageAspect } from "@/lib/gemini";
import { persistImageUrl } from "@/lib/r2";
import {
  TextSegmentSchema,
  type SlideDesign,
  type TextSegment,
} from "@/lib/schema";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL = process.env.DESIGN_MODEL ?? "gemini-2.5-flash";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const REMIX_SYSTEM_PROMPT = `You are customizing a prebuilt social-media carousel COVER slide for a new brief.

The slide's LAYOUT is fixed — positions, sizes, fonts, colors, and shapes must NOT change. Your only job is to rewrite the slide's TEXT (and decide whether any IMAGE should be swapped) so the cover fits the user's new topic.

RULES
- For every TEXT slot, return new content that fits the new brief while keeping a SIMILAR length and the SAME role (a short eyebrow stays short, a headline stays a headline, a footer stays a footer). Do not make a short label into a paragraph.
- Write in the SAME LANGUAGE as the brief.
- If a text slot has highlighted/italic runs (segments), you MAY return a new 'segments' array to keep an accent/italic word — the concatenation of segment texts MUST equal 'content'. If you do not need segments, omit them and just return 'content'.
- For IMAGE slots, set regenerateImage:true ONLY if the brief explicitly calls for a different picture/photo. Otherwise leave the image untouched (omit the edit or set regenerateImage:false). When regenerating, provide a detailed 'imagePrompt'.
- If the brief implies one of the user's uploaded photos should fill an image slot, set 'useUserImage' to that photo's index instead of regenerating.
- Return one edit per slot you want to change. Reference slots by their exact id.`;

const EditSchema = z.object({
  edits: z.array(
    z.object({
      id: z.string().describe("The slot id to edit (e.g. 't0', 't2_1', 'i0')."),
      content: z.string().optional().describe("New text for a text slot."),
      segments: z
        .array(TextSegmentSchema)
        .optional()
        .describe(
          "Optional inline runs for a text slot; concatenation must equal content.",
        ),
      regenerateImage: z
        .boolean()
        .optional()
        .describe("Set true to replace an image slot with a freshly generated image."),
      imagePrompt: z
        .string()
        .optional()
        .describe("Prompt for the regenerated image (required when regenerateImage is true)."),
      useUserImage: z
        .number()
        .int()
        .optional()
        .describe("Index into the user's uploaded photos to use for an image slot."),
    }),
  ),
});

interface TextSlotRef {
  id: string;
  el: { content: string; segments?: TextSegment[] };
}

interface ImageSlotRef {
  id: string;
  imageId: string;
  aspect: ImageAspect;
  currentPrompt: string;
}

function aspectOf(width: number, height: number): ImageAspect {
  if (!width || !height) return "portrait";
  const ratio = width / height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

/** Collect references to editable text/image slots inside a (cloned) design. */
function collectSlots(design: SlideDesign): {
  textSlots: TextSlotRef[];
  imageSlots: ImageSlotRef[];
} {
  const textSlots: TextSlotRef[] = [];
  const imageSlots: ImageSlotRef[] = [];

  design.elements.forEach((el, i) => {
    if (el.kind === "text") {
      textSlots.push({ id: `t${i}`, el });
    } else if (el.kind === "image") {
      imageSlots.push({
        id: `i${i}`,
        imageId: el.imageId,
        aspect: aspectOf(el.width, el.height),
        currentPrompt: design.images[el.imageId]?.prompt ?? "",
      });
    } else if (el.kind === "stack") {
      el.children.forEach((child, ci) => {
        if (child.kind === "text") {
          textSlots.push({ id: `t${i}_${ci}`, el: child });
        } else if (child.kind === "image") {
          imageSlots.push({
            id: `i${i}_${ci}`,
            imageId: child.imageId,
            aspect: aspectOf(child.width, child.height),
            currentPrompt: design.images[child.imageId]?.prompt ?? "",
          });
        }
      });
    }
  });

  return { textSlots, imageSlots };
}

export interface RemixCoverOptions {
  /** The template cover design (will be cloned, not mutated). */
  design: SlideDesign;
  /** The user's new brief. */
  prompt: string;
  /** Persisted urls for the user's uploaded photos, in order. */
  userImageUrls?: string[];
}

/**
 * Customize a prebuilt template cover for a new brief: rewrite text and
 * (on-demand) swap images while preserving every layout/geometry/font/palette
 * field. Returns a new SlideDesign — never mutates the input. On any model
 * failure the original design is returned unchanged so the cover still renders.
 */
export async function remixTemplateCover(
  opts: RemixCoverOptions,
): Promise<SlideDesign> {
  const { prompt, userImageUrls = [] } = opts;
  const design: SlideDesign = structuredClone(opts.design);
  const { textSlots, imageSlots } = collectSlots(design);

  if (textSlots.length === 0 && imageSlots.length === 0) return design;

  const textListing = textSlots
    .map((s) => `${s.id}: ${JSON.stringify(s.el.content)}`)
    .join("\n");
  const imageListing = imageSlots
    .map((s) => `${s.id}: current image "${s.currentPrompt}"`)
    .join("\n");
  const userImageNote =
    userImageUrls.length > 0
      ? `\n\nThe user uploaded ${userImageUrls.length} photo(s), indices 0..${userImageUrls.length - 1}. Use 'useUserImage' to place one in an image slot when appropriate.`
      : "";

  const userMessage = `NEW BRIEF:\n${prompt}\n\nTEXT SLOTS (rewrite to fit the brief, keep similar length & role):\n${textListing || "(none)"}\n\nIMAGE SLOTS (keep unless the brief calls for a different picture):\n${imageListing || "(none)"}${userImageNote}`;

  let edits: z.infer<typeof EditSchema>["edits"];
  try {
    const result = await generateObject({
      model: gemini(MODEL),
      schema: EditSchema,
      system: REMIX_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      providerOptions: {
        google: {
          thinkingConfig: MODEL.includes("pro")
            ? { thinkingBudget: 128 }
            : { thinkingBudget: 0 },
        },
      },
    });
    edits = result.object.edits;
  } catch (err) {
    console.warn("template cover remix failed; keeping original cover", err);
    return design;
  }

  const textById = new Map(textSlots.map((s) => [s.id, s] as const));
  const imageById = new Map(imageSlots.map((s) => [s.id, s] as const));

  for (const edit of edits) {
    const textSlot = textById.get(edit.id);
    if (textSlot) {
      if (typeof edit.content === "string") {
        textSlot.el.content = edit.content;
        // Reset segments unless the model supplied a consistent override.
        textSlot.el.segments =
          edit.segments && edit.segments.length > 0 ? edit.segments : undefined;
      } else if (edit.segments && edit.segments.length > 0) {
        textSlot.el.segments = edit.segments;
        textSlot.el.content = edit.segments.map((seg) => seg.text).join("");
      }
      continue;
    }

    const imageSlot = imageById.get(edit.id);
    if (!imageSlot) continue;

    const existing = design.images[imageSlot.imageId];

    if (
      typeof edit.useUserImage === "number" &&
      edit.useUserImage >= 0 &&
      edit.useUserImage < userImageUrls.length
    ) {
      design.images[imageSlot.imageId] = {
        url: userImageUrls[edit.useUserImage],
        prompt: existing?.prompt ?? "User photo",
      };
      continue;
    }

    if (edit.regenerateImage && edit.imagePrompt?.trim()) {
      try {
        const { dataUrl } = await generateImage(
          edit.imagePrompt.trim(),
          imageSlot.aspect,
        );
        const url = await persistImageUrl(dataUrl, imageSlot.imageId);
        design.images[imageSlot.imageId] = {
          url,
          prompt: edit.imagePrompt.trim(),
        };
      } catch (err) {
        console.warn("template image regeneration failed", err);
      }
    }
  }

  return design;
}
