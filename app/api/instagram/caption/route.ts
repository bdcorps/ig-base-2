import { generateCaption } from "@/lib/captionGenerator";
import type { SlideDesign } from "@/lib/schema";
import { z } from "zod";

export const maxDuration = 60;

// Kept intentionally loose — we only read element text out of the design, so we
// don't want to reject an otherwise-valid carousel on a strict schema mismatch.
const CaptionSchema = z.object({
  prompt: z.string().default(""),
  slides: z
    .array(z.object({ design: z.object({ elements: z.array(z.unknown()) }).passthrough() }))
    .min(1),
});

// Captions are a stateless transform of client-provided carousel content (no
// user data touched), so this endpoint is open — the preview works even before
// the user signs in / connects an account.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CaptionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid caption payload" }, { status: 400 });
  }

  try {
    const caption = await generateCaption({
      prompt: parsed.data.prompt,
      slides: parsed.data.slides as { design: SlideDesign }[],
    });
    return Response.json({ caption });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Caption generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
