import { auth } from "@/lib/auth";
import { clearConnection, getConnection, toStatus } from "@/lib/instagram";
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
  const connection = await getConnection(userId);
  return Response.json(toStatus(connection));
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await clearConnection(userId);
  return Response.json(toStatus(null));
}
