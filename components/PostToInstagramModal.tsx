"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { trackEvent } from "@/lib/analytics";
import { signIn } from "@/lib/auth-client";
import type { SlideState } from "@/lib/slideState";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface InstagramStatus {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  configured: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  slides: SlideState[];
  prompt: string;
  /** Rasterize the offscreen 1080px slides to PNG data URLs (owned by the workspace). */
  captureSlideImages: () => Promise<string[]>;
  /** Path to return to after the OAuth round-trip (should re-open this modal). */
  returnTo: string;
}

type PublishPhase = "idle" | "capturing" | "uploading" | "publishing" | "done" | "error";

const CARD_WIDTH = 375;
const IMAGE_HEIGHT = Math.round((CARD_WIDTH * 1350) / 1080);

export default function PostToInstagramModal({
  open,
  onClose,
  slides,
  prompt,
  captureSlideImages,
  returnTo,
}: Props) {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [index, setIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PublishPhase>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [permalink, setPermalink] = useState<string | null>(null);
  const captionRequested = useRef(false);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/instagram");
      if (res.status === 401) {
        setSignedOut(true);
        setStatus(null);
      } else if (res.ok) {
        setSignedOut(false);
        setStatus((await res.json()) as InstagramStatus);
      }
    } catch {
      // Leave status null on failure.
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const generateCaption = useCallback(async () => {
    if (slides.length === 0) return;
    setCaptionLoading(true);
    setCaptionError(null);
    try {
      const res = await fetch("/api/instagram/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          slides: slides.map((s) => ({ design: s.design })),
        }),
      });
      const json = (await res.json()) as { caption?: string; error?: string };
      if (!res.ok || !json.caption) throw new Error(json.error ?? "Failed to write caption");
      setCaption(json.caption);
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : "Failed to write caption");
    } finally {
      setCaptionLoading(false);
    }
  }, [prompt, slides]);

  // On open: load connection status + auto-draft a caption once.
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    void refreshStatus();
    if (!captionRequested.current) {
      captionRequested.current = true;
      void generateCaption();
    }
  }, [open, refreshStatus, generateCaption]);

  // Reset transient publish state whenever the modal is closed.
  useEffect(() => {
    if (open) return;
    setPhase("idle");
    setPublishError(null);
    setPermalink(null);
  }, [open]);

  const handleConnect = useCallback(() => {
    const params = new URLSearchParams({ returnTo });
    window.location.href = `/api/instagram/oauth/start?${params.toString()}`;
  }, [returnTo]);

  const handleSignIn = useCallback(() => {
    void signIn.social({ provider: "google", callbackURL: returnTo });
  }, [returnTo]);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/instagram", { method: "DELETE" });
    await refreshStatus();
  }, [refreshStatus]);

  const handlePublish = useCallback(async () => {
    if (!status?.connected || slides.length === 0) return;
    setPublishError(null);
    try {
      setPhase("capturing");
      const dataUrls = await captureSlideImages();
      if (dataUrls.length === 0) throw new Error("Could not capture slides");

      setPhase("uploading");
      const imageUrls = await Promise.all(
        dataUrls.map(async (dataUrl) => {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          const json = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !json.url) throw new Error(json.error ?? "Image upload failed");
          return json.url;
        }),
      );

      setPhase("publishing");
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls, caption }),
      });
      const json = (await res.json()) as {
        permalink?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Publish failed");
      setPermalink(json.permalink ?? null);
      setPhase("done");
      trackEvent("post_to_instagram", {
        slide_count: slides.length,
      });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, [status, slides, caption, captureSlideImages]);

  if (!open) return null;

  const username = status?.username ?? "your_handle";
  const busy = phase === "capturing" || phase === "uploading" || phase === "publishing";
  const publishLabel =
    phase === "capturing"
      ? "Rendering slides…"
      : phase === "uploading"
        ? "Uploading images…"
        : phase === "publishing"
          ? "Posting to Instagram…"
          : "Share to Instagram";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ---- Left: Instagram post mockup ---- */}
        <div className="hidden w-[420px] shrink-0 flex-col items-center justify-center bg-neutral-50 p-8 md:flex">
          <div
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
            style={{ width: CARD_WIDTH }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                  {status?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={status.avatarUrl}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] font-semibold text-neutral-500">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[13px] font-semibold text-neutral-900">
                  {username}
                </span>
                <span className="text-[11px] text-neutral-500">Original audio</span>
              </div>
              <MoreHorizontal className="ml-auto h-4 w-4 text-neutral-700" />
            </div>

            {/* Carousel image */}
            <div
              className="relative select-none overflow-hidden bg-neutral-100"
              style={{ width: CARD_WIDTH, height: IMAGE_HEIGHT }}
            >
              {slides[index] ? (
                <SlideRenderer
                  design={slides[index].design}
                  theme={slides[index].theme}
                  displayWidth={CARD_WIDTH}
                />
              ) : null}

              {/* Slide counter */}
              {slides.length > 1 && (
                <div className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {index + 1}/{slides.length}
                </div>
              )}

              {/* Prev / next arrows */}
              {slides.length > 1 && index > 0 && (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-800 shadow transition hover:bg-white"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {slides.length > 1 && index < slides.length - 1 && (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-800 shadow transition hover:bg-white"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-4 px-3 pb-1 pt-2.5">
              <Heart className="h-6 w-6 text-neutral-900" />
              <MessageCircle className="h-6 w-6 -scale-x-100 text-neutral-900" />
              <Send className="h-6 w-6 text-neutral-900" />
              {slides.length > 1 && (
                <div className="flex flex-1 items-center justify-center gap-1">
                  {slides.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-blue-500" : "bg-neutral-300"
                        }`}
                    />
                  ))}
                </div>
              )}
              <Bookmark className={`h-6 w-6 text-neutral-900 ${slides.length > 1 ? "" : "ml-auto"}`} />
            </div>

            {/* Likes + caption */}
            <div className="px-3 pb-3 pt-1">
              <p className="text-[13px] font-semibold text-neutral-900">1,248 likes</p>
              <p className="mt-1 whitespace-pre-wrap wrap-break-word text-[13px] leading-snug text-neutral-900">
                <span className="font-semibold">{username}</span>{" "}
                {caption || (captionLoading ? "Writing your caption…" : "Your caption will appear here.")}
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-wide text-neutral-400">
                Just now
              </p>
            </div>
          </div>
        </div>

        {/* ---- Right: controls ---- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
            <h2 className="text-[15px] font-semibold text-neutral-900">Post to Instagram</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Connection card */}
            <ConnectionCard
              status={status}
              signedOut={signedOut}
              loading={statusLoading}
              onConnect={handleConnect}
              onSignIn={handleSignIn}
              onDisconnect={handleDisconnect}
            />

            {/* Caption editor */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[13px] font-medium text-neutral-700">Caption</label>
                <button
                  type="button"
                  onClick={generateCaption}
                  disabled={captionLoading}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
                >
                  {captionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {captionLoading ? "Writing…" : caption ? "Regenerate" : "Write with AI"}
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={9}
                maxLength={2200}
                placeholder="Write a caption, or let AI draft one from your carousel…"
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-neutral-900 outline-none transition focus:border-neutral-400"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                {captionError && <span className="text-red-500">{captionError}</span>}
                <span>{caption.length}/2200</span>
              </div>
            </div>
          </div>

          {/* Footer / publish */}
          <div className="border-t border-neutral-200 px-5 py-3.5">
            {phase === "done" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-[13px] font-medium text-green-700">
                  <Check className="h-4 w-4" />
                  Posted to Instagram 🎉
                </div>
                <div className="flex gap-2">
                  {permalink && (
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      View on Instagram
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 cursor-pointer rounded-lg bg-neutral-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-neutral-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {publishError && (
                  <p className="mb-2 text-[12px] text-red-500">{publishError}</p>
                )}
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!status?.connected || busy || slides.length === 0}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-pink-500 via-red-500 to-yellow-500 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {publishLabel}
                </button>
                {!status?.connected && !statusLoading && (
                  <p className="mt-2 text-center text-[12px] text-neutral-400">
                    {signedOut
                      ? "Sign in and connect an account to post."
                      : "Connect an Instagram account to post."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({
  status,
  signedOut,
  loading,
  onConnect,
  onSignIn,
  onDisconnect,
}: {
  status: InstagramStatus | null;
  signedOut: boolean;
  loading: boolean;
  onConnect: () => void;
  onSignIn: () => void;
  onDisconnect: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-3 text-[13px] text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
      </div>
    );
  }

  if (signedOut) {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-dashed border-neutral-300 px-4 py-4">
        <div>
          <p className="text-[13px] font-medium text-neutral-800">Sign in to post</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            Sign in with Google, then connect your Instagram account to post this carousel.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </button>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
        <div className="h-9 w-9 shrink-0 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
            {status.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-[13px] font-semibold text-neutral-500">
                {(status.username ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-semibold text-neutral-900">
            @{status.username}
          </span>
          <span className="text-[11px] text-neutral-500">Connected</span>
        </div>
        <button
          type="button"
          onClick={onDisconnect}
          className="ml-auto cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const notConfigured = Boolean(status && !status.configured);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-dashed border-neutral-300 px-4 py-4">
      <div>
        <p className="text-[13px] font-medium text-neutral-800">Connect Instagram</p>
        <p className="mt-0.5 text-[12px] text-neutral-500">
          {notConfigured
            ? "Instagram posting isn't set up on this server yet."
            : "Link your Instagram professional account to post directly."}
        </p>
      </div>
      <button
        type="button"
        onClick={onConnect}
        disabled={notConfigured}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-600 via-pink-500 to-orange-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16m0 1.62c-3.15 0-3.52.01-4.76.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.9-.19-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32-1.24-.06-1.61-.07-4.76-.07m0 2.76a5.46 5.46 0 1 1 0 10.92 5.46 5.46 0 0 1 0-10.92m0 1.62a3.84 3.84 0 1 0 0 7.68 3.84 3.84 0 0 0 0-7.68m5.65-2.9a1.28 1.28 0 1 1 0 2.56 1.28 1.28 0 0 1 0-2.56" />
        </svg>
        Connect Instagram
      </button>
    </div>
  );
}
