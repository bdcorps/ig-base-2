"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { buildCover, themeFor, type CarouselTemplate } from "@/lib/templates";
import { consumeDesignStream } from "@/lib/designStream";
import { saveEditorSession } from "@/lib/editorSession";
import type { SlideState } from "@/lib/slideState";
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
    // The template's layout + style now come from its id (server-side remix),
    // so the prompt is purely the user's brief. Pre-fill only the contextual
    // prompt (if any); the template's own prompt is no longer merged in.
    setPrompt(contextPrompt.trim());
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

    let slides: SlideState[] = [];

    try {
      await consumeDesignStream(
        prompt.trim(),
        (update) => {
          if (update.type === "slides") slides = update.slides;
          else if (update.type === "error") throw new Error(update.message);
        },
        undefined,
        photos.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        template.slideCount,
        template.id,
      );

      // The model occasionally finishes a run without adding any visible
      // elements (sets up a palette/background then stops). Rather than drop
      // the user onto a blank canvas, fall back to the template's own cover
      // design so generating from a template always yields something.
      const hasContent = slides.some((s) => s.design.elements.length > 0);
      if (!hasContent) {
        slides = [{ design: buildCover(template), theme: themeFor(template) }];
      }

      // Colors + fonts come from the user's brand kit and are streamed on the
      // palette event, so slides already carry the right theme — no override.

      saveEditorSession({ prompt: prompt.trim(), slides });
      onClose();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function seeTemplate() {
    if (!template) return;
    const slide: SlideState = {
      design: buildCover(template),
      theme: themeFor(template),
    };
    saveEditorSession({ prompt: template.prompt, slides: [slide] });
    onClose();
    router.push("/");
  }

  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
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
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[320px_1fr]">
          <div className="flex items-center justify-center border-b border-neutral-200 bg-neutral-50 p-6 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
              <SlideRenderer
                design={buildCover(template)}
                theme={themeFor(template)}
                displayWidth={280}
              />
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
                      className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
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
                className="cursor-pointer rounded-xl border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={seeTemplate}
                disabled={loading}
                className="cursor-pointer rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                See template
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading || !prompt.trim()}
                className="flex-1 cursor-pointer rounded-xl bg-[#B4A2D7] px-5 py-3 text-sm font-semibold text-neutral-900 transition-opacity disabled:opacity-50"
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
