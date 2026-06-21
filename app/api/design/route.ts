import { parseDesignRequestBody } from "@/lib/designEvents";
import { runDesignGeneration } from "@/lib/runDesignGeneration";

export type { DesignEvent } from "@/lib/designEvents";

// Image generation can take a while; allow a generous budget.
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runDesignGeneration({
          prompt: input.prompt,
          userImages: input.userImages,
          slideCount: input.slideCount,
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
