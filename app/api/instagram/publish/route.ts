import { auth } from "@/lib/auth";
import { getConnection, publishCarousel } from "@/lib/instagram";
import { headers } from "next/headers";
import { z } from "zod";

// Publishing hits several sequential Instagram endpoints; give it room.
export const maxDuration = 120;

const PublishSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(10),
  caption: z.string().max(2200),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid publish payload" }, { status: 400 });
  }

  const connection = await getConnection(userId);
  if (!connection) {
    return Response.json({ error: "Instagram account not connected" }, { status: 400 });
  }

  try {
    const result = await publishCarousel(
      connection,
      parsed.data.imageUrls,
      parsed.data.caption,
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
