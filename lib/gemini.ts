import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Generate images with Gemini "Nano Banana" (gemini-2.5-flash-image) and return
 * base64 data URLs. Used by the design agent's generateImage / generateSticker
 * tools and the aesthetic template cover-photo generator.
 *
 * Requires one of GOOGLE_GENERATIVE_AI_PRO_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 * or GEMINI_API_KEY. Override the model with GEMINI_IMAGE_MODEL.
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

/** First available Google Generative AI key, in priority order. */
export function resolveGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_PRO_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    undefined
  );
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "No Gemini API key set (GOOGLE_GENERATIVE_AI_PRO_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY)",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export type ImageAspect = "portrait" | "landscape" | "square";

const ASPECT_RATIO: Record<ImageAspect, string> = {
  portrait: "4:5",
  landscape: "16:9",
  square: "1:1",
};

/** Split a data URL into its mime type and raw base64 payload. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");
  return { mimeType: match[1], data: match[2] };
}

/** Pull the first inline image out of a Gemini image response stream. */
async function readImageFromStream(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContentStream"]>>,
): Promise<{ dataUrl: string }> {
  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data) {
        const mime = inline.mimeType ?? "image/png";
        return { dataUrl: `data:${mime};base64,${inline.data}` };
      }
    }
  }

  throw new Error("Gemini returned no image data");
}

export async function generateImage(
  prompt: string,
  aspect: ImageAspect = "portrait",
): Promise<{ dataUrl: string }> {
  const ai = getClient();

  const response = await ai.models.generateContentStream({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: ASPECT_RATIO[aspect],
        imageSize: "1K",
      },
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return readImageFromStream(response);
}

/**
 * Generate an image using a reference image as visual guidance (image-to-image).
 * The reference is passed to Gemini alongside the text instruction so the model
 * can mimic its composition/texture/mood while the prompt drives the changes
 * (e.g. recoloring to a brand palette).
 */
export async function generateImageFromReference(
  prompt: string,
  referenceDataUrl: string,
  aspect: ImageAspect = "portrait",
): Promise<{ dataUrl: string }> {
  const ai = getClient();
  const { mimeType, data } = parseDataUrl(referenceDataUrl);

  const response = await ai.models.generateContentStream({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data } }, { text: prompt }],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: ASPECT_RATIO[aspect],
        imageSize: "1K",
      },
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return readImageFromStream(response);
}

const STICKER_CHROMAKEY_PROMPT = `Create a sticker-style illustration on a SOLID CHROMAKEY GREEN background (#00FF00).

CRITICAL CHROMAKEY REQUIREMENTS:
- The entire background must be pure flat #00FF00 green — no gradients, textures, or shadows on the background.
- Do NOT put green on the subject edges; keep the subject cleanly separated from the background.
- Single isolated subject with crisp edges, suitable for cutout compositing.
- No checkerboard or fake transparency patterns.
- Never write any text, graphs on the image.

Subject: `;

/**
 * Generate a sticker (isolated subject) and return a transparent PNG data URL.
 * Gemini cannot emit real alpha, so we generate on chromakey green and strip it.
 */
export async function generateSticker(
  prompt: string,
  aspect: ImageAspect = "square",
): Promise<{ dataUrl: string }> {
  const { dataUrl } = await generateImage(STICKER_CHROMAKEY_PROMPT + prompt, aspect);
  const { removeChromakey } = await import("@/lib/chromakey");
  const transparent = await removeChromakey(dataUrl);
  return { dataUrl: transparent };
}
