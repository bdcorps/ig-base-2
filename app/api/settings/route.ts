import { auth } from "@/lib/auth";
import { DEFAULT_BRAND_KIT, normalizeBrandKit } from "@/lib/brandKit";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true, bio: true, brandKit: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    profile: {
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio ?? "",
    },
    brandKit: user.brandKit ? normalizeBrandKit(user.brandKit) : DEFAULT_BRAND_KIT,
  });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = (body ?? {}) as { bio?: unknown; brandKit?: unknown };
  const brandKit = normalizeBrandKit(payload.brandKit);
  const bio = typeof payload.bio === "string" ? payload.bio.slice(0, 2000) : undefined;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      brandKit,
      ...(bio != null ? { bio } : {}),
    },
    select: { name: true, email: true, image: true, bio: true, brandKit: true },
  });

  return Response.json({
    profile: {
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio ?? "",
    },
    brandKit: normalizeBrandKit(user.brandKit),
  });
}
