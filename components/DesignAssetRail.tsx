"use client";

import { STICKERS, type StickerAsset } from "@/lib/stickers";
import { ImagePlus, Loader2, Sparkles, Sticker as StickerIcon, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { useRef, useState } from "react";

export interface PlacedAsset {
  url: string;
  imageId: string;
  prompt: string;
  fit: "cover" | "contain";
}

/** dataTransfer MIME type used to drag assets from the rail onto the canvas. */
export const ASSET_DRAG_TYPE = "application/x-carousel-asset";

/**
 * Use a clean clone of the inner <img> as the drag ghost. Cloning into <body>
 * escapes the tile's rounded/overflow-hidden container, which otherwise makes
 * the browser's default ghost show the gray tile background in the corners.
 */
function setAssetDragImage(e: React.DragEvent) {
  const source = e.currentTarget.querySelector("img");
  if (!source) return;
  const w = source.clientWidth || 96;
  const h = source.clientHeight || 96;
  const ghost = source.cloneNode(true) as HTMLImageElement;
  ghost.style.cssText = `position:fixed;top:0;left:0;width:${w}px;height:${h}px;object-fit:contain;border:0;border-radius:0;background:transparent;pointer-events:none;`;
  ghost.setAttribute("data-drag-ghost", "");
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, w / 2, h / 2);
  window.setTimeout(() => ghost.remove(), 0);
}

function assetDragHandlers(asset: PlacedAsset, disabled?: boolean) {
  if (disabled) return {};
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(asset));
      e.dataTransfer.effectAllowed = "copy";
      setAssetDragImage(e);
    },
  };
}

interface Props {
  /** Images already present in the active slide (imageId -> { url, prompt }). */
  images: Record<string, { url: string; prompt: string }>;
  /** Place an asset (image or sticker) onto the canvas. */
  onPlaceAsset: (asset: PlacedAsset) => void | Promise<void>;
  /** Upload a local file and place it onto the canvas. */
  onUploadFile: (file: File) => Promise<void>;
  /** Disabled while there is no active slide to add to. */
  disabled?: boolean;
}

type Tab = "images" | "stickers";

const TABS: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "images", label: "Images", icon: ImagePlus },
  { id: "stickers", label: "Stickers", icon: StickerIcon },
];

export default function DesignAssetRail({ images, onPlaceAsset, onUploadFile, disabled }: Props) {
  const [activeTab, setActiveTab] = useState<Tab | null>("images");

  return (
    <div className="flex h-full shrink-0">
      <nav className="flex h-full w-[76px] shrink-0 flex-col items-center gap-1 border-r border-neutral-200/80 bg-white py-4">
        <Link href="/" className="mb-3 flex h-10 w-10 items-center justify-center" aria-label="Home">
          <Image src="/logo.svg" alt="Carousel Studio" width={28} height={28} className="shrink-0" />
        </Link>

        {TABS.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab((cur) => (cur === item.id ? null : item.id))}
              aria-pressed={active}
              className="group flex w-full cursor-pointer flex-col items-center gap-1 py-1.5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 group-hover:bg-neutral-100 group-hover:text-neutral-900"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  active ? "font-medium text-neutral-900" : "text-neutral-500 group-hover:text-neutral-900"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {activeTab && (
        <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-neutral-200/80 bg-white">
          <div className="flex h-[52px] shrink-0 items-center border-b border-neutral-200/80 px-4">
            <h2 className="text-[14px] font-semibold text-text-base">
              {activeTab === "images" ? "Images" : "Stickers"}
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "images" ? (
              <ImagesTab
                images={images}
                onPlaceAsset={onPlaceAsset}
                onUploadFile={onUploadFile}
                disabled={disabled}
              />
            ) : (
              <StickersTab onPlaceAsset={onPlaceAsset} disabled={disabled} />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function ImagesTab({
  images,
  onPlaceAsset,
  onUploadFile,
  disabled,
}: {
  images: Props["images"];
  onPlaceAsset: Props["onPlaceAsset"];
  onUploadFile: Props["onUploadFile"];
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await onUploadFile(file);
    } finally {
      setUploading(false);
    }
  }

  const entries = Object.entries(images);

  return (
    <div className="flex flex-col">
      <Section>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-3 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
      </Section>

      <Section title="Generate with AI">
        <AiGenerateForm
          kind="image"
          placeholder="A minimalist mountain landscape at dusk…"
          disabled={disabled}
          onPlaceAsset={onPlaceAsset}
        />
      </Section>

      <Section title="In this design">
        {entries.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-gray-700">
            Images you upload or generate will appear here so you can reuse them.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {entries.map(([imageId, img]) => {
              const asset: PlacedAsset = {
                url: img.url,
                imageId,
                prompt: img.prompt,
                fit: imageId.startsWith("sticker") ? "contain" : "cover",
              };
              return (
                <button
                  key={imageId}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPlaceAsset(asset)}
                  {...assetDragHandlers(asset, disabled)}
                  title={img.prompt}
                  className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 transition-colors hover:border-neutral-400 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.prompt}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function StickersTab({
  onPlaceAsset,
  disabled,
}: {
  onPlaceAsset: Props["onPlaceAsset"];
  disabled?: boolean;
}) {
  function stickerAsset(sticker: StickerAsset): PlacedAsset {
    return {
      url: sticker.src,
      imageId: `sticker-${sticker.id}-${Date.now()}`,
      prompt: `${sticker.label} sticker`,
      fit: "contain",
    };
  }

  return (
    <div className="flex flex-col">
      <Section title="Generate with AI">
        <AiGenerateForm
          kind="sticker"
          placeholder="A cute cartoon avocado with a smile…"
          disabled={disabled}
          onPlaceAsset={onPlaceAsset}
        />
      </Section>

      <Section title="Library">
        <div className="grid grid-cols-3 gap-2">
          {STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              disabled={disabled}
              onClick={() => onPlaceAsset(stickerAsset(sticker))}
              draggable={!disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(stickerAsset(sticker)));
                e.dataTransfer.effectAllowed = "copy";
                setAssetDragImage(e);
              }}
              title={sticker.label}
              className="flex aspect-square cursor-grab items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 transition-colors hover:border-neutral-400 hover:bg-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.src}
                alt={sticker.label}
                draggable={false}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function AiGenerateForm({
  kind,
  placeholder,
  disabled,
  onPlaceAsset,
}: {
  kind: "image" | "sticker";
  placeholder: string;
  disabled?: boolean;
  onPlaceAsset: Props["onPlaceAsset"];
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, kind }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url: string; imageId: string; prompt: string }
        | { error: string }
        | null;
      if (!res.ok || !data || "error" in data) {
        throw new Error((data && "error" in data && data.error) || "Generation failed");
      }
      await onPlaceAsset({
        url: data.url,
        imageId: data.imageId,
        prompt: data.prompt,
        fit: kind === "sticker" ? "contain" : "cover",
      });
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || loading}
        className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={generate}
        disabled={disabled || loading || !prompt.trim()}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Generating…" : kind === "sticker" ? "Generate sticker" : "Generate image"}
      </button>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-neutral-200/80 px-4 py-4 last:border-b-0">
      {title && (
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
