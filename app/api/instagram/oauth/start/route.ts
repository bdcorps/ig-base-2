import { auth } from "@/lib/auth";
import { instagramAuthorizeUrl, isInstagramConfigured } from "@/lib/instagram";
import { cookies, headers } from "next/headers";

const STATE_COOKIE = "ig_oauth_state";

function safeReturnTo(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  if (!user) {
    return Response.redirect(new URL("/", request.url));
  }

  // Instagram posting requires Meta app credentials on the server.
  if (!isInstagramConfigured()) {
    const redirect = new URL(returnTo, request.url);
    redirect.searchParams.set("ig", "not_configured");
    return Response.redirect(redirect);
  }

  // Bounce to Instagram's authorize screen with a CSRF state nonce.
  const nonce = crypto.randomUUID();
  const state = JSON.stringify({ nonce, returnTo });
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return Response.redirect(instagramAuthorizeUrl(nonce));
}
