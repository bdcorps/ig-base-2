"use client";

import type { CarouselTemplate } from "@/lib/templates";
import { consumeDesignStreamLegacy } from "@/lib/designStream";
import { saveEditorSession } from "@/lib/editorSession";
import { DEFAULT_THEME } from "@/lib/fonts";
import type { SlideDesign, Theme } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface UploadedPhoto {
  id: string;
  dataUrl: string;
  name: string;
}

interface TemplatePreviewSheetProps {
  template: CarouselTemplate | null;
  contextPrompt?: string;
  onClose: () => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TemplatePreviewSheet({
  template,
  contextPrompt = "",
  onClose,
}: TemplatePreviewSheetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;
    const base = template.prompt;
    const merged = contextPrompt.trim()
      ? `${contextPrompt.trim()}\n\n${base}`
      : base;
    setPrompt(merged);
    setPhotos([]);
    setError(null);
  }, [template, contextPrompt]);

  useEffect(() => {
    if (!template) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [template, onClose]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const next = await Promise.all(
      imageFiles.map(async (file) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        dataUrl: await fileToDataUrl(file),
        name: file.name,
      })),
    );
    setPhotos((prev) => [...prev, ...next].slice(0, 8));
  }, []);

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  async function generate() {
    if (!template || !prompt.trim()) return;
    setLoading(true);
    setError(null);

    let theme: Theme = { ...DEFAULT_THEME };
    let design: SlideDesign = {
      background: { type: "solid", color: "background" },
      elements: [],
      images: {},
    };

    try {
      await consumeDesignStreamLegacy(
        prompt.trim(),
        (update) => {
          if (update.type === "palette") theme = update.theme;
          else if (update.type === "design") design = update.design;
          else if (update.type === "error") throw new Error(update.message);
        },
        undefined,
        photos.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
      );

      saveEditorSession({ prompt: prompt.trim(), design, theme });
      onClose();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{template.title}</h2>
            <p className="text-sm text-[#8E8E93]">Customize and generate your carousel slide</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[320px_1fr]">
          <div className="flex items-center justify-center border-b border-neutral-200 bg-neutral-50 p-6 lg:border-b-0 lg:border-r">
            <div className="relative aspect-9/16 w-full max-w-[280px] overflow-hidden rounded-2xl ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={template.previewImage}
                alt={template.title}
                className="h-full w-full object-cover"
              />
              {template.badge && (
                <span className="absolute bottom-3 right-3 rounded-full bg-[#FF3B30] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
                  {template.badge}
                </span>
              )}
              {template.isNew && (
                <span className="absolute left-3 top-3 -rotate-6 rounded-md bg-[#FFD60A] px-2 py-0.5 text-[11px] font-bold text-neutral-900">
                  New!
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-y-auto p-6">
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Your prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="mb-5 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
              placeholder="Describe what you want on this slide…"
            />

            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Your photos
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                dragOver
                  ? "border-[#B4A2D7] bg-[#B4A2D7]/10"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white"
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <UploadIcon />
              </div>
              <p className="text-sm font-medium text-neutral-800">
                Drag & drop photos here
              </p>
              <p className="mt-1 text-xs text-[#8E8E93]">
                or click to browse · up to 8 images
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {photos.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="h-20 w-20 rounded-xl object-cover ring-1 ring-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove ${photo.name}`}
                    >
                      ×
                    </button>
                    <p className="mt-1 max-w-20 truncate text-[10px] text-[#8E8E93]">
                      {photo.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="mt-auto flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading || !prompt.trim()}
                className="flex-1 rounded-xl bg-[#B4A2D7] px-5 py-3 text-sm font-semibold text-neutral-900 transition-opacity disabled:opacity-50"
              >
                {loading ? "Generating carousel…" : "Generate carousel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
