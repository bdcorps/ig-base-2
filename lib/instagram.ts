import { prisma } from "@/lib/prisma";
import { Prisma } from "../generated/prisma/client";

/**
 * Instagram integration.
 *
 * Uses the Instagram Graph API (Instagram Login flavour, via graph.instagram.com)
 * for OAuth + carousel content publishing. Requires the INSTAGRAM_APP_ID /
 * INSTAGRAM_APP_SECRET env vars to be configured.
 */

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
// Unversioned host — used for the token/profile endpoints that don't take a version.
const GRAPH_HOST = "https://graph.instagram.com";
// Configurable (possibly versioned) base for the media / publish graph calls.
const GRAPH_BASE = process.env.INSTAGRAM_GRAPH_API_BASE ?? GRAPH_HOST;
const SCOPES = "instagram_business_basic,instagram_business_content_publish";

export interface InstagramConnection {
  igUserId: string;
  username: string;
  avatarUrl?: string;
  accessToken: string;
  tokenExpiresAt?: string;
  connectedAt: string;
}

/** Public (safe to send to the client) view of a connection. */
export interface InstagramStatus {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  /** Whether Meta credentials are configured on the server. */
  configured: boolean;
}

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function instagramRedirectUri(): string {
  if (process.env.INSTAGRAM_REDIRECT_URI) return process.env.INSTAGRAM_REDIRECT_URI;
  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/instagram/oauth/callback`;
}

export function instagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID as string,
    redirect_uri: instagramRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// --- Persistence -----------------------------------------------------------

function parseConnection(raw: unknown): InstagramConnection | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<InstagramConnection>;
  if (!c.igUserId || !c.username || !c.accessToken) return null;
  return {
    igUserId: c.igUserId,
    username: c.username,
    avatarUrl: c.avatarUrl,
    accessToken: c.accessToken,
    tokenExpiresAt: c.tokenExpiresAt,
    connectedAt: c.connectedAt ?? new Date().toISOString(),
  };
}

export async function getConnection(userId: string): Promise<InstagramConnection | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagram: true },
  });
  return parseConnection(user?.instagram);
}

export async function saveConnection(
  userId: string,
  connection: InstagramConnection,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { instagram: connection as unknown as Prisma.InputJsonValue },
  });
}

export async function clearConnection(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { instagram: Prisma.DbNull },
  });
}

export function toStatus(connection: InstagramConnection | null): InstagramStatus {
  return {
    connected: Boolean(connection),
    username: connection?.username ?? null,
    avatarUrl: connection?.avatarUrl ?? null,
    configured: isInstagramConfigured(),
  };
}

// --- OAuth (real mode) -----------------------------------------------------

interface ShortTokenResponse {
  access_token: string;
  user_id: string | number;
}

/** Exchange an OAuth code for a short-lived token + IG user id. */
export async function exchangeCodeForToken(code: string): Promise<ShortTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID as string,
    client_secret: process.env.INSTAGRAM_APP_SECRET as string,
    grant_type: "authorization_code",
    redirect_uri: instagramRedirectUri(),
    code,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as ShortTokenResponse;
}

/** Upgrade a short-lived token to a 60-day long-lived token. */
export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET as string,
    access_token: shortToken,
  });
  const res = await fetch(`${GRAPH_HOST}/access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Long-lived token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function fetchProfile(
  accessToken: string,
): Promise<{ user_id: string; username: string; profile_picture_url?: string }> {
  const params = new URLSearchParams({
    fields: "user_id,username,profile_picture_url",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_HOST}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Profile fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    user_id: string;
    username: string;
    profile_picture_url?: string;
  };
}

// --- Publishing ------------------------------------------------------------

export interface PublishResult {
  mediaId: string;
  permalink: string | null;
}

async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? `Instagram API error (${res.status})`);
  }
  return { id: json.id };
}

/**
 * Publish a carousel (2-10 images) to the connected account. Image URLs must be
 * publicly reachable HTTPS URLs (we host slide PNGs on R2).
 */
export async function publishCarousel(
  connection: InstagramConnection,
  imageUrls: string[],
  caption: string,
): Promise<PublishResult> {
  const { igUserId, accessToken } = connection;

  if (imageUrls.length === 1) {
    // Single image post.
    const child = await graphPost(`${igUserId}/media`, {
      image_url: imageUrls[0],
      caption,
      access_token: accessToken,
    });
    const published = await graphPost(`${igUserId}/media_publish`, {
      creation_id: child.id,
      access_token: accessToken,
    });
    return finishPublish(igUserId, accessToken, published.id);
  }

  // Multi-image carousel: create an item container per image...
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const item = await graphPost(`${igUserId}/media`, {
      image_url: url,
      is_carousel_item: "true",
      access_token: accessToken,
    });
    childIds.push(item.id);
  }

  // ...then a carousel container referencing them...
  const carousel = await graphPost(`${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    access_token: accessToken,
  });

  // ...then publish it.
  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: carousel.id,
    access_token: accessToken,
  });

  return finishPublish(igUserId, accessToken, published.id);
}

async function finishPublish(
  igUserId: string,
  accessToken: string,
  mediaId: string,
): Promise<PublishResult> {
  let permalink: string | null = null;
  try {
    const params = new URLSearchParams({ fields: "permalink", access_token: accessToken });
    const res = await fetch(`${GRAPH_BASE}/${mediaId}?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { permalink?: string };
      permalink = json.permalink ?? null;
    }
  } catch {
    // Permalink is best-effort.
  }
  return { mediaId, permalink };
}
