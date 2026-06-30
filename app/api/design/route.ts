import { auth } from "@/lib/auth";
import { DEFAULT_BRAND_KIT, normalizeBrandKit, type BrandKit } from "@/lib/brandKit";
import { parseDesignRequestBody } from "@/lib/designEvents";
import { prisma } from "@/lib/prisma";
import { runDesignGeneration } from "@/lib/runDesignGeneration";
import { headers } from "next/headers";

export type { DesignEvent } from "@/lib/designEvents";

// Image generation can take a while; allow a generous budget.
export const maxDuration = 120;

/** Load the signed-in user's brand kit (colors + fonts) for the generation. */
async function loadBrandKit(): Promise<BrandKit> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return DEFAULT_BRAND_KIT;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { brandKit: true },
    });
    return user?.brandKit ? normalizeBrandKit(user.brandKit) : DEFAULT_BRAND_KIT;
  } catch (err) {
    console.warn("failed to load brand kit", err);
    return DEFAULT_BRAND_KIT;
  }
}

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

  const brandKit = await loadBrandKit();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runDesignGeneration({
          prompt: input.prompt,
          userImages: input.userImages,
          slideCount: input.slideCount,
          templateId: input.templateId,
          brandKit,
          onEvent: (event) => {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          },
        });
      } catch {
        // Error events are emitted inside runDesignGeneration before re-throwing.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
