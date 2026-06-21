import { assembleDesign } from "@/lib/assembleDesign";
import { parseDesignRequestBody } from "@/lib/designEvents";

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseDesignRequestBody(body);
  if (!input) {
    return Response.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  try {
    const result = await assembleDesign({
      prompt: input.prompt,
      userImages: input.userImages,
      slideCount: input.slideCount,
    });

    return Response.json(result);
  } catch (err) {
    console.error("cloud design assembly failed", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Design generation failed",
      },
      { status: 500 },
    );
  }
}
