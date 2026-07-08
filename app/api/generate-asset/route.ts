import { generateImage, generateSticker, type ImageAspect } from "@/lib/gemini";
import { persistImageUrl } from "@/lib/r2";
import { z } from "zod";

const GenerateAssetSchema = z.object({
  prompt: z.string().min(1, "prompt is required").max(1000),
  kind: z.enum(["image", "sticker"]).default("image"),
  aspect: z.enum(["portrait", "landscape", "square"]).optional(),
});

// Image generation + R2 upload can take a while.
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { prompt, kind } = parsed.data;
  const aspect: ImageAspect =
    parsed.data.aspect ?? (kind === "sticker" ? "square" : "portrait");
  const imageId = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const { dataUrl } =
      kind === "sticker"
        ? await generateSticker(prompt, aspect)
        : await generateImage(prompt, aspect);
    const url = await persistImageUrl(dataUrl, imageId);
    return Response.json({ url, imageId, prompt });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Asset generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
