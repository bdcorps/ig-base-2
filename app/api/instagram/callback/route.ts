import { auth } from "@/lib/auth";
import {
  type InstagramConnection,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchProfile,
  saveConnection,
} from "@/lib/instagram";
import { cookies, headers } from "next/headers";

const STATE_COOKIE = "ig_oauth_state";

function redirectWith(request: Request, returnTo: string, status: string): Response {
  const target = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const url = new URL(target, request.url);
  url.searchParams.set("ig", status);
  return Response.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const stored = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  let returnTo = "/";
  let nonce: string | null = null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { nonce: string; returnTo: string };
      returnTo = parsed.returnTo || "/";
      nonce = parsed.nonce;
    } catch {
      // Ignore malformed state.
    }
  }

  if (error || !code) {
    return redirectWith(request, returnTo, "error");
  }
  if (!nonce || nonce !== state) {
    return redirectWith(request, returnTo, "error");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return redirectWith(request, returnTo, "error");
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);
    const profile = await fetchProfile(long.access_token);

    const connection: InstagramConnection = {
      igUserId: profile.user_id ?? String(short.user_id),
      username: profile.username,
      avatarUrl: profile.profile_picture_url,
      accessToken: long.access_token,
      tokenExpiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString(),
      connectedAt: new Date().toISOString(),
    };
    await saveConnection(userId, connection);
    return redirectWith(request, returnTo, "connected");
  } catch (err) {
    console.error("Instagram OAuth callback failed", err);
    return redirectWith(request, returnTo, "error");
  }
}
