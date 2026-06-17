import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

/**
 * Generate an image with Gemini 3.1 Flash Image and return it as a base64 data
 * URL. Used by the design agent's generateImage tool.
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
