"use client";

import { useSession } from "@/lib/auth-client";
import {
  type AuthorPhoto,
  type BrandColor,
  type BrandKit,
  DEFAULT_BRAND_KIT,
} from "@/lib/brandKit";
import { FONT_CATEGORIES, GOOGLE_FONTS, googleFontsHref } from "@/lib/fonts";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProfileData {
  name: string;
  email: string;
  image: string | null;
  bio: string;
}

const MAX_PHOTOS = 12;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(dataUrl: string): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error("Upload failed");
  const json = (await res.json()) as { url: string };
  return json.url;
}

export default function SettingsScreen() {
  const { data: session, isPending: sessionPending } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Google fonts so previews render in the right typeface.
  useEffect(() => {
    const id = "settings-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontsHref([...GOOGLE_FONTS]);
  }, []);

  useEffect(() => {
    if (sessionPending) return;
    if (!session?.user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const json = (await res.json()) as { profile: ProfileData; brandKit: BrandKit };
        if (cancelled) return;
        setProfile(json.profile);
        setBrandKit(json.brandKit);
      } catch {
        if (!cancelled && session.user) {
          setProfile({
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
            bio: "",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, sessionPending]);

  const save = useCallback(
    async (next: BrandKit, bio: string) => {
      setSaving(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandKit: next, bio }),
        });
        if (res.ok) setSavedAt(Date.now());
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleSave = useCallback(() => {
    save(brandKit, profile?.bio ?? "");
  }, [save, brandKit, profile]);

  // --- Colors ---
  function updateColor(id: string, patch: Partial<BrandColor>) {
    setBrandKit((kit) => ({
      ...kit,
      colors: kit.colors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function setMainColor(id: string) {
    setBrandKit((kit) => ({
      ...kit,
      colors: kit.colors.map((c) => ({ ...c, isMain: c.id === id })),
    }));
  }

  function addColor() {
    const id = `color-${Date.now()}`;
    setBrandKit((kit) => ({
      ...kit,
      colors: [...kit.colors, { id, name: "New color", hex: "#888888", isMain: false }],
    }));
  }

  function removeColor(id: string) {
    setBrandKit((kit) => {
      const remaining = kit.colors.filter((c) => c.id !== id);
      if (remaining.length === 0) return kit;
      if (!remaining.some((c) => c.isMain)) remaining[0].isMain = true;
      return { ...kit, colors: remaining };
    });
  }

  // --- Photos ---
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploading(true);
    try {
      const slots = Math.max(0, MAX_PHOTOS - brandKit.authorPhotos.length);
      const toUpload = images.slice(0, slots);
      const uploaded: AuthorPhoto[] = [];
      for (const file of toUpload) {
        const dataUrl = await fileToDataUrl(file);
        // Upload to R2 (falls back to a data URL in local dev).
        const url = await uploadImage(dataUrl);
        uploaded.push({ id: `photo-${Date.now()}-${uploaded.length}`, url });
      }
      if (uploaded.length === 0) return;
      const nextKit: BrandKit = {
        ...brandKit,
        authorPhotos: [...brandKit.authorPhotos, ...uploaded],
      };
      setBrandKit(nextKit);
      // Persist immediately so the R2 URLs are stored in the DB.
      await save(nextKit, profile?.bio ?? "");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(id: string) {
    const nextKit: BrandKit = {
      ...brandKit,
      authorPhotos: brandKit.authorPhotos.filter((p) => p.id !== id),
    };
    setBrandKit(nextKit);
    void save(nextKit, profile?.bio ?? "");
  }

  if (!sessionPending && !session?.user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>
        <p className="mt-2 text-[13px] text-neutral-500">Sign in to manage your profile and brand kit.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-8 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
            <p className="mt-1 text-[14px] text-neutral-500">
              Manage your profile and brand kit for your carousels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && !saving ? (
              <span className="text-[12px] text-neutral-400">Saved</span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 w-full animate-pulse rounded-2xl bg-neutral-100" />
            <div className="h-64 w-full animate-pulse rounded-2xl bg-neutral-100" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Profile</h2>

              <div className="mt-5 flex items-center gap-4">
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xl font-medium text-neutral-600">
                    {(profile?.name || profile?.email || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-neutral-900">
                    {profile?.name || "—"}
                  </p>
                  <p className="truncate text-[13px] text-neutral-500">{profile?.email}</p>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-[13px] font-medium text-neutral-700">Bio</label>
                <textarea
                  value={profile?.bio ?? ""}
                  onChange={(e) =>
                    setProfile((p) => (p ? { ...p, bio: e.target.value } : p))
                  }
                  rows={3}
                  placeholder="A short bio that can appear on your carousels."
                  className="mt-1.5 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-[13px] text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                />
              </div>
            </section>

            {/* Instagram */}
            <InstagramSettingsSection returnTo="/settings" />

            {/* Brand kit */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Brand kit</h2>

              {/* Colors */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-medium text-neutral-700">Colors</h3>
                  <button
                    type="button"
                    onClick={addColor}
                    className="text-[12px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    + Add color
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {brandKit.colors.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"
                    >
                      <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-neutral-200">
                        <span
                          className="block h-full w-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        <input
                          type="color"
                          value={color.hex}
                          onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <input
                          value={color.name}
                          onChange={(e) => updateColor(color.id, { name: e.target.value })}
                          className="w-full bg-transparent text-[13px] font-medium text-neutral-800 outline-none"
                        />
                        <input
                          value={color.hex}
                          onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                          className="w-full bg-transparent text-[12px] uppercase text-neutral-400 outline-none"
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => setMainColor(color.id)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${color.isMain
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                            }`}
                        >
                          {color.isMain ? "Main" : "Set main"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeColor(color.id)}
                          className="text-[10px] text-neutral-400 transition-colors hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonts */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[13px] font-medium text-neutral-700">Heading font</label>
                  <select
                    value={brandKit.headingFont}
                    onChange={(e) =>
                      setBrandKit((kit) => ({ ...kit, headingFont: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px] text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                  >
                    {FONT_CATEGORIES.map((cat) => (
                      <optgroup key={cat.label} label={cat.label}>
                        {cat.fonts.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p
                    className="mt-2 truncate text-[20px] text-neutral-900"
                    style={{ fontFamily: brandKit.headingFont }}
                  >
                    The quick brown fox
                  </p>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-neutral-700">Body font</label>
                  <select
                    value={brandKit.bodyFont}
                    onChange={(e) =>
                      setBrandKit((kit) => ({ ...kit, bodyFont: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px] text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                  >
                    {FONT_CATEGORIES.map((cat) => (
                      <optgroup key={cat.label} label={cat.label}>
                        {cat.fonts.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p
                    className="mt-2 truncate text-[15px] text-neutral-600"
                    style={{ fontFamily: brandKit.bodyFont }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </div>

              {/* Author photos */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-medium text-neutral-700">
                    Author photos
                    <span className="ml-1.5 text-[12px] font-normal text-neutral-400">
                      {brandKit.authorPhotos.length}/{MAX_PHOTOS}
                    </span>
                  </h3>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {brandKit.authorPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove photo"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {brandKit.authorPhotos.length < MAX_PHOTOS ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600 disabled:opacity-50"
                    >
                      {uploading ? (
                        <span className="text-[12px]">Uploading…</span>
                      ) : (
                        <>
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-[11px]">Upload</span>
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

interface InstagramStatus {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  configured: boolean;
}

function InstagramSettingsSection({ returnTo }: { returnTo: string }) {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram");
      if (res.ok) setStatus((await res.json()) as InstagramStatus);
    } catch {
      // Ignore — leave prior status.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/instagram");
        if (active && res.ok) setStatus((await res.json()) as InstagramStatus);
      } catch {
        // Ignore.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(() => {
    window.location.href = `/api/instagram/oauth/start?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  const disconnect = useCallback(async () => {
    await fetch("/api/instagram", { method: "DELETE" });
    await refresh();
  }, [refresh]);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Instagram</h2>
      <p className="mt-1 text-[13px] text-neutral-500">
        Connect your account to publish carousels straight to your feed.
      </p>

      <div className="mt-5">
        {loading ? (
          <div className="h-16 w-full animate-pulse rounded-xl bg-neutral-100" />
        ) : status?.connected ? (
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
            <span className="h-11 w-11 shrink-0 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                {status.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={status.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-[14px] font-semibold text-neutral-500">
                    {(status.username ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-neutral-900">
                @{status.username}
              </p>
              <p className="text-[12px] text-neutral-500">Connected</p>
            </div>
            <button
              type="button"
              onClick={disconnect}
              className="ml-auto rounded-lg border border-neutral-200 px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-neutral-300 p-4">
            <p className="text-[13px] text-neutral-500">
              {status && !status.configured
                ? "Instagram posting isn't set up on this server yet."
                : "No account connected yet."}
            </p>
            <button
              type="button"
              onClick={connect}
              disabled={Boolean(status && !status.configured)}
              className="shrink-0 rounded-lg bg-linear-to-r from-purple-600 via-pink-500 to-orange-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect Instagram
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
