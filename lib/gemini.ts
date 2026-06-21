import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

/**
 * Generate images with Gemini 3.1 Flash Image and return base64 data URLs.
 * Used by the design agent's generateImage / generateSticker tools.
 *
 * Requires GEMINI_API_KEY in the environment.
 */

const MODEL = "gemini-3.1-flash-image";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
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
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },
      imageConfig: {
        aspectRatio: ASPECT_RATIO[aspect],
        imageSize: "1K",
      },
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

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

const STICKER_CHROMAKEY_PROMPT = `Create a sticker-style illustration on a SOLID CHROMAKEY GREEN background (#00FF00).

CRITICAL CHROMAKEY REQUIREMENTS:
- The entire background must be pure flat #00FF00 green — no gradients, textures, or shadows on the background.
- Do NOT put green on the subject edges; keep the subject cleanly separated from the background.
- Single isolated subject with crisp edges, suitable for cutout compositing.
- No checkerboard or fake transparency patterns.

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
