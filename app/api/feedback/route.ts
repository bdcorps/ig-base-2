import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FeedbackSchema = z.object({
  promptId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback payload" }, { status: 400 });
  }

  const { promptId, rating, comment } = parsed.data;
  const feedback = {
    rating,
    comment: comment?.trim() || null,
    submittedAt: new Date().toISOString(),
  };

  try {
    await prisma.prompt.update({
      where: { id: promptId },
      data: { feedback },
    });
  } catch {
    return Response.json({ error: "Prompt not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
