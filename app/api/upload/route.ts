import { persistImageUrl } from "@/lib/r2";
import { z } from "zod";

const UploadSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "Expected an image data URL"),
});

// Allow time for the R2 upload to complete.
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const imageId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const url = await persistImageUrl(parsed.data.dataUrl, imageId);
    return Response.json({ url, imageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
