"use client";

import Controls from "@/components/Controls";
import DesignAssetRail, { ASSET_DRAG_TYPE, type PlacedAsset } from "@/components/DesignAssetRail";
import PostToInstagramModal from "@/components/PostToInstagramModal";
import SidebarSection from "@/components/SidebarSection";
import SlideRenderer, { type ElementSelection } from "@/components/SlideRenderer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGeneration } from "@/context/GenerationsContext";
import { useSlideEditHistory } from "@/hooks/useSlideEditHistory";
import { trackEvent } from "@/lib/analytics";
import { captureSlidesAsDataUrls, downloadSlidesAsZip } from "@/lib/exportSlides";
import { DEFAULT_THEME } from "@/lib/fonts";
import { generationTitle } from "@/lib/generations";
import type {
  ImageElement,
  PaletteOption,
  ShapeElement,
  SlideElement,
  StackChild,
  Theme,
} from "@/lib/schema";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/schema";
import { SHAPE_VARIANTS, shapeClipPath, type ShapeVariant } from "@/lib/shapes";
import type { SlideState } from "@/lib/slideState";
import {
  ArrowLeft,
  ChevronDown,
  Ellipsis,
  Image as ImageIcon,
  Layers,
  Loader2,
  Square,
  SquarePlus,
  Type,
  Ungroup,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  id: string;
}

type LayerOrderAction = "front" | "back" | "forward" | "backward";

type LayerOrderMenuState = {
  selection: ElementSelection;
  x: number;
  y: number;
};

export default function DesignWorkspace({ id }: Props) {
  const router = useRouter();
  const { generation, updateGeneration, deleteGeneration, hydrated } = useGeneration(id);
  const [selection, setSelection] = useState<ElementSelection | null>(null);
  const [stackEditIndex, setStackEditIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [layerOrderMenu, setLayerOrderMenu] = useState<LayerOrderMenuState | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const restoreSlides = useCallback(
    (slides: SlideState[]) => {
      updateGeneration(id, { slides });
    },
    [id, updateGeneration],
  );

  const { pushHistory, undo, redo } = useSlideEditHistory(
    generation?.slides ?? [],
    restoreSlides,
    generation ? `${id}:${generation.activeSlideIndex}` : id,
  );

  const deleteSelection = useCallback(() => {
    if (!generation || !selection) return;
    pushHistory();
    const slideIdx = generation.activeSlideIndex;

    if (selection.childIndex != null) {
      updateGeneration(id, {
        slides: generation.slides.map((s, i) => {
          if (i !== slideIdx) return s;
          const elements = s.design.elements.flatMap((el, j) => {
            if (j !== selection.elementIndex || el.kind !== "stack") return [el];
            const children = el.children.filter((_, ci) => ci !== selection.childIndex);
            if (children.length === 0) return [];
            return [{ ...el, children }];
          });
          return { ...s, design: { ...s.design, elements } };
        }),
      });
      setSelection({ elementIndex: selection.elementIndex });
      return;
    }

    updateGeneration(id, {
      slides: generation.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
            ...s,
            design: {
              ...s.design,
              elements: s.design.elements.filter((_, j) => j !== selection.elementIndex),
            },
          },
      ),
    });
    setSelection(null);
    setStackEditIndex(null);
  }, [generation, selection, id, updateGeneration, pushHistory]);

  const handleSelect = useCallback(
    (next: ElementSelection | null) => {
      setSelection(next);
      if (next == null) {
        setStackEditIndex(null);
        return;
      }
      if (next.childIndex != null) {
        setStackEditIndex(next.elementIndex);
        return;
      }
      const el = generation?.slides[generation.activeSlideIndex]?.design.elements[next.elementIndex];
      if (el?.kind !== "stack") {
        setStackEditIndex(null);
        return;
      }
      setStackEditIndex((cur) => (cur === next.elementIndex ? cur : null));
    },
    [generation],
  );

  const enterStackEdit = useCallback((elementIndex: number) => {
    setStackEditIndex(elementIndex);
    setSelection({ elementIndex });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (inField) return;
        if (layerOrderMenu) {
          setLayerOrderMenu(null);
        } else if (selection?.childIndex != null) {
          setSelection({ elementIndex: selection.elementIndex });
        } else if (stackEditIndex != null) {
          setStackEditIndex(null);
        } else {
          setSelection(null);
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        if (inField) return;
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        if (inField) return;
        e.preventDefault();
        redo();
        return;
      }

      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (inField || !selection) return;
      e.preventDefault();
      deleteSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, stackEditIndex, layerOrderMenu, deleteSelection, undo, redo]);

  useEffect(() => {
    if (selection == null) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("[data-active-canvas]") ||
        target?.closest("[data-inspector]") ||
        target?.closest("[data-layer-order-menu]")
      ) {
        return;
      }
      setSelection(null);
      setStackEditIndex(null);
      setLayerOrderMenu(null);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selection]);

  // Re-open the post modal after returning from the Instagram OAuth round-trip
  // (start route redirects back to /design/[id]?post=1&ig=...), then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("post") === "1") {
      const timer = window.setTimeout(() => setPostOpen(true), 0);
      params.delete("post");
      params.delete("ig");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
      return () => window.clearTimeout(timer);
    }
  }, []);

  const captureSlideImages = useCallback(async () => {
    await document.fonts.ready;
    const roots = exportRefs.current
      .map((el) => el?.querySelector("[data-slide-export]") as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];
    return captureSlidesAsDataUrls(roots);
  }, []);

  if (!generation) {
    if (!hydrated) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] text-text-tertiary">Loading design…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-gray-700">Design not found</p>
        <Link href="/" className="mt-2 text-[13px] text-text-tertiary underline hover:text-gray-700">
          Start a new design
        </Link>
      </div>
    );
  }

  const gen = generation;
  const activeSlide = gen.slides[gen.activeSlideIndex] ?? null;

  function setActiveSlideIndex(index: number) {
    if (index === gen.activeSlideIndex) return;
    updateGeneration(id, { activeSlideIndex: index });
    setSelection(null);
    setStackEditIndex(null);
    setLayerOrderMenu(null);
  }

  function updateTheme(theme: Theme) {
    const idx = gen.activeSlideIndex;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i === idx ? { ...s, theme } : { ...s, theme: { ...s.theme, fonts: theme.fonts } },
      ),
    });
  }

  function selectPalette(option: PaletteOption) {
    updateGeneration(id, {
      activePaletteId: option.id,
      slides: gen.slides.map((s) => ({
        ...s,
        theme: { ...s.theme, palette: option.palette },
      })),
    });
  }

  const sidebarTheme = activeSlide?.theme ?? DEFAULT_THEME;
  const showThemePanel = Boolean(activeSlide) || gen.generatedPalettes.length > 0;

  function updateElement(index: number, patch: Partial<SlideElement>, recordHistory = false) {
    if (recordHistory) pushHistory();
    const slideIdx = gen.activeSlideIndex;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
            ...s,
            design: {
              ...s.design,
              elements: s.design.elements.map((el, j) =>
                j === index ? ({ ...el, ...patch } as SlideElement) : el,
              ),
            },
          },
      ),
    });
  }

  function reorderElementLayer(action: LayerOrderAction) {
    if (!activeSlide || !layerOrderMenu) return;
    const elements = activeSlide.design.elements;
    const from = layerOrderMenu.selection.elementIndex;
    const last = elements.length - 1;
    if (from < 0 || from > last) {
      setLayerOrderMenu(null);
      return;
    }

    const to =
      action === "front"
        ? last
        : action === "back"
          ? 0
          : action === "forward"
            ? Math.min(last, from + 1)
            : Math.max(0, from - 1);

    if (to === from) {
      setLayerOrderMenu(null);
      return;
    }

    const nextElements = [...elements];
    const [moved] = nextElements.splice(from, 1);
    nextElements.splice(to, 0, moved);

    pushHistory();
    const slideIdx = gen.activeSlideIndex;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx ? s : { ...s, design: { ...s.design, elements: nextElements } },
      ),
    });
    setSelection({ elementIndex: to });
    setStackEditIndex(null);
    setLayerOrderMenu(null);
  }

  function updateStackChild(
    stackIndex: number,
    childIndex: number,
    patch: Partial<StackChild>,
    recordHistory = false,
  ) {
    if (recordHistory) pushHistory();
    const slideIdx = gen.activeSlideIndex;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
            ...s,
            design: {
              ...s.design,
              elements: s.design.elements.map((el, j) => {
                if (j !== stackIndex || el.kind !== "stack") return el;
                return {
                  ...el,
                  children: el.children.map((child, ci) =>
                    ci === childIndex ? ({ ...child, ...patch } as StackChild) : child,
                  ),
                };
              }),
            },
          },
      ),
    });
  }

  function updateSlideImage(
    imageId: string,
    patch: { url: string; prompt?: string },
    recordHistory = false,
  ) {
    if (recordHistory) pushHistory();
    const slideIdx = gen.activeSlideIndex;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
            ...s,
            design: {
              ...s.design,
              images: {
                ...s.design.images,
                [imageId]: {
                  url: patch.url,
                  prompt: patch.prompt ?? s.design.images[imageId]?.prompt ?? "User upload",
                },
              },
            },
          },
      ),
    });
  }

  function deleteDesign() {
    deleteGeneration(id);
    setMenuOpen(false);
    router.push("/");
  }

  async function downloadZip() {
    if (gen.slides.length === 0) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const roots = exportRefs.current
        .map((el) => el?.querySelector("[data-slide-export]") as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];
      await downloadSlidesAsZip(roots);
      trackEvent("export_design", {
        generation_id: id,
        slide_count: gen.slides.length,
      });
    } catch (err) {
      updateGeneration(id, {
        error: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  /**
   * Add an image element (with its image record) to a slide. Defaults to the
   * active slide, centered; pass `slideIndex`/`center` to drop at a point.
   */
  function placeImageElement(opts: {
    imageId: string;
    url: string;
    prompt: string;
    naturalW: number;
    naturalH: number;
    fit: "cover" | "contain";
    slideIndex?: number;
    /** Canvas-space (0-1080, 0-1350) coordinates for the element's center. */
    center?: { x: number; y: number };
  }) {
    const slideIdx = opts.slideIndex ?? gen.activeSlideIndex;
    const slide = gen.slides[slideIdx];
    if (!slide) return;
    const targetWidth = Math.round(CANVAS_WIDTH * (opts.fit === "contain" ? 0.4 : 0.6));
    const ratio = opts.naturalW > 0 ? opts.naturalH / opts.naturalW : 1;
    const width = targetWidth;
    const height = Math.round(targetWidth * ratio);
    const cx = opts.center?.x ?? CANVAS_WIDTH / 2;
    const cy = opts.center?.y ?? CANVAS_HEIGHT / 2;
    const newElement: ImageElement = {
      kind: "image",
      x: Math.round(cx - width / 2),
      y: Math.round(cy - height / 2),
      width,
      height,
      rotation: 0,
      imageId: opts.imageId,
      fit: opts.fit,
      borderRadius: 0,
      opacity: 1,
    };

    pushHistory();
    const newIndex = slide.design.elements.length;
    updateGeneration(id, {
      activeSlideIndex: slideIdx,
      slides: gen.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : {
            ...s,
            design: {
              ...s.design,
              images: {
                ...s.design.images,
                [opts.imageId]: { url: opts.url, prompt: opts.prompt },
              },
              elements: [...s.design.elements, newElement],
            },
          },
      ),
    });
    setSelection({ elementIndex: newIndex });
    setStackEditIndex(null);
  }

  async function addImageFromFile(file: File) {
    if (!activeSlide) return;
    const dataUrl = await readImageFile(file);
    const { width: naturalW, height: naturalH } = await readImageDimensions(dataUrl);
    const { url, imageId } = await uploadImage(dataUrl);
    placeImageElement({ imageId, url, prompt: file.name, naturalW, naturalH, fit: "cover" });
    trackEvent("upload_image", { generation_id: id, slide_index: gen.activeSlideIndex });
  }

  /** Place an image/sticker (built-in, generated, or reused) from a hosted URL. */
  async function placeAsset(asset: PlacedAsset) {
    if (!activeSlide) return;
    try {
      const { width, height } = await readImageDimensions(asset.url);
      placeImageElement({
        imageId: asset.imageId,
        url: asset.url,
        prompt: asset.prompt,
        naturalW: width,
        naturalH: height,
        fit: asset.fit,
      });
      trackEvent("add_asset", {
        generation_id: id,
        slide_index: gen.activeSlideIndex,
        fit: asset.fit,
      });
    } catch (err) {
      updateGeneration(id, {
        error: err instanceof Error ? err.message : "Failed to add asset",
      });
    }
  }

  /** Place an asset at a specific slide + canvas-space center (drag-and-drop). */
  async function placeAssetAt(
    asset: PlacedAsset,
    target: { slideIndex: number; center: { x: number; y: number } },
  ) {
    try {
      const { width, height } = await readImageDimensions(asset.url);
      placeImageElement({
        imageId: asset.imageId,
        url: asset.url,
        prompt: asset.prompt,
        naturalW: width,
        naturalH: height,
        fit: asset.fit,
        slideIndex: target.slideIndex,
        center: target.center,
      });
      trackEvent("add_asset", {
        generation_id: id,
        slide_index: target.slideIndex,
        fit: asset.fit,
      });
    } catch (err) {
      updateGeneration(id, {
        error: err instanceof Error ? err.message : "Failed to add asset",
      });
    }
  }

  function addShape(variant: ShapeVariant) {
    if (!activeSlide) return;
    const size = 480;
    const newShape: ShapeElement = {
      kind: "shape",
      x: Math.round((CANVAS_WIDTH - size) / 2),
      y: Math.round((CANVAS_HEIGHT - size) / 2),
      width: size,
      height: size,
      rotation: 0,
      variant,
      color: "accent",
      borderRadius: variant === "rect" ? 48 : 0,
    };
    pushHistory();
    const slideIdx = gen.activeSlideIndex;
    const newIndex = activeSlide.design.elements.length;
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx
          ? s
          : { ...s, design: { ...s.design, elements: [...s.design.elements, newShape] } },
      ),
    });
    setSelection({ elementIndex: newIndex });
    setStackEditIndex(null);
    setShapeMenuOpen(false);
  }

  /** Mask an image element into a shape: the shape holds the image, the standalone image is removed. */
  function maskImageIntoShape(imageIndex: number, shapeIndex: number) {
    if (!activeSlide) return;
    const els = activeSlide.design.elements;
    const img = els[imageIndex];
    const shape = els[shapeIndex];
    if (img?.kind !== "image" || shape?.kind !== "shape") return;
    pushHistory();
    const slideIdx = gen.activeSlideIndex;
    const nextElements = els
      .map((el, i) =>
        i === shapeIndex && el.kind === "shape"
          ? ({ ...el, imageId: img.imageId, fit: img.fit } as SlideElement)
          : el,
      )
      .filter((_, i) => i !== imageIndex);
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx ? s : { ...s, design: { ...s.design, elements: nextElements } },
      ),
    });
    // Removing the image shifts indices after it down by one.
    setSelection({ elementIndex: imageIndex < shapeIndex ? shapeIndex - 1 : shapeIndex });
    setStackEditIndex(null);
    trackEvent("mask_image_into_shape", { generation_id: id, slide_index: slideIdx });
  }

  /** Pull a masked image back out of a shape into its own image element. */
  function separateShapeImage(shapeIndex: number) {
    if (!activeSlide) return;
    const els = activeSlide.design.elements;
    const shape = els[shapeIndex];
    if (shape?.kind !== "shape" || !shape.imageId) return;
    pushHistory();
    const slideIdx = gen.activeSlideIndex;
    const restored: ImageElement = {
      kind: "image",
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation ?? 0,
      imageId: shape.imageId,
      fit: shape.fit ?? "cover",
      borderRadius: 0,
      opacity: 1,
    };
    const nextElements: SlideElement[] = [
      ...els.map((el, i) =>
        i === shapeIndex && el.kind === "shape"
          ? ({ ...el, imageId: undefined } as SlideElement)
          : el,
      ),
      restored,
    ];
    updateGeneration(id, {
      slides: gen.slides.map((s, i) =>
        i !== slideIdx ? s : { ...s, design: { ...s.design, elements: nextElements } },
      ),
    });
    setSelection({ elementIndex: nextElements.length - 1 });
    setStackEditIndex(null);
  }

  function dragHasFile(e: React.DragEvent) {
    return Array.from(e.dataTransfer.items ?? []).some((item) => item.kind === "file");
  }

  function dragHasAsset(e: React.DragEvent) {
    return Array.from(e.dataTransfer.types ?? []).includes(ASSET_DRAG_TYPE);
  }

  function onCanvasDragOver(e: React.DragEvent) {
    if (!activeSlide || (!dragHasFile(e) && !dragHasAsset(e))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  /** Map a drop event to the slide under the pointer + canvas-space coordinates. */
  function resolveDropTarget(
    e: React.DragEvent,
  ): { slideIndex: number; center: { x: number; y: number } } | null {
    const slideEl = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-slide-index]");
    const exportEl = slideEl?.querySelector<HTMLElement>("[data-slide-export]");
    if (!slideEl || !exportEl) return null;
    const slideIndex = Number(slideEl.dataset.slideIndex);
    if (Number.isNaN(slideIndex)) return null;
    const rect = exportEl.getBoundingClientRect();
    const scale = rect.width > 0 ? CANVAS_WIDTH / rect.width : 1;
    const x = Math.max(0, Math.min(CANVAS_WIDTH, (e.clientX - rect.left) * scale));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT, (e.clientY - rect.top) * scale));
    return { slideIndex, center: { x, y } };
  }

  async function onCanvasDrop(e: React.DragEvent) {
    if (!activeSlide) return;

    const assetRaw = e.dataTransfer.getData(ASSET_DRAG_TYPE);
    if (assetRaw) {
      e.preventDefault();
      let asset: PlacedAsset;
      try {
        asset = JSON.parse(assetRaw) as PlacedAsset;
      } catch {
        return;
      }
      const target = resolveDropTarget(e) ?? {
        slideIndex: gen.activeSlideIndex,
        center: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      };
      await placeAssetAt(asset, target);
      return;
    }

    e.preventDefault();
    const file = Array.from(e.dataTransfer.files ?? []).find((f) =>
      f.type.startsWith("image/"),
    );
    if (!file) return;
    try {
      await addImageFromFile(file);
    } catch (err) {
      updateGeneration(id, {
        error: err instanceof Error ? err.message : "Failed to add image",
      });
    }
  }

  if (gen.status === "error" && gen.slides.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="mb-3 h-2.5 w-2.5 rounded-full bg-red-500" />
        <p className="text-[14px] font-medium text-primary">Generation failed</p>
        <p className="mt-1 max-w-md text-[13px] text-red-600">
          {gen.error ?? "Something went wrong"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DesignAssetRail
          images={activeSlide?.design.images ?? {}}
          onPlaceAsset={placeAsset}
          onUploadFile={addImageFromFile}
          disabled={!activeSlide}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200/80 bg-white px-4 py-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-neutral-100"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="truncate text-[14px] font-medium text-text-base">
                {generationTitle(gen.prompt)}
              </h1>
              {gen.status === "running" && (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-text-tertiary [animation-duration:0.5s]"
                  aria-label="Generating"
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {activeSlide && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShapeMenuOpen((v) => !v)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50"
                    aria-expanded={shapeMenuOpen}
                  >
                    <ShapePlusIcon className="h-4 w-4" />
                    Add shape
                  </button>
                  {shapeMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-pointer"
                        aria-label="Close menu"
                        onClick={() => setShapeMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 grid w-[200px] grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-sm">
                        {SHAPE_VARIANTS.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => addShape(v.id)}
                            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md px-2 py-2 text-[12px] text-primary hover:bg-neutral-50"
                          >
                            <ShapeGlyph variant={v.id} className="h-6 w-6 text-gray-700" />
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {gen.slides.length > 0 && gen.status === "complete" && (
                <>
                  <button
                    type="button"
                    onClick={downloadZip}
                    disabled={exporting}
                    className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {exporting ? "Exporting…" : "Export"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostOpen(true)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50"
                  >
                    <InstagramGlyph className="h-4 w-4" />
                    Post to IG
                  </button>
                </>
              )}
              <AlertDialog>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="cursor-pointer rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-neutral-100 hover:text-gray-700"
                    aria-label="More actions"
                    aria-expanded={menuOpen}
                  >
                    <EllipsisIcon className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-pointer"
                        aria-label="Close menu"
                        onClick={() => setMenuOpen(false)}
                      />

                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-neutral-200 bg-white py-1 shadow-sm">
                        <AlertDialogTrigger
                          onClick={() => setMenuOpen(false)}
                          className="block w-full cursor-pointer px-3 py-1.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </AlertDialogTrigger>
                      </div>
                    </>
                  )}
                </div>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this design?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The design and its slides will be permanently
                      removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={deleteDesign}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section
              className="flex min-w-0 flex-1 flex-col overflow-y-auto"
              onDragOver={onCanvasDragOver}
              onDrop={onCanvasDrop}
            >
              <div className="flex flex-col items-center gap-10 px-8 py-6">
                {gen.slides.length > 0 ? (
                  gen.slides.map((slide, i) => {
                    const isActive = i === gen.activeSlideIndex;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-2"
                        data-active-canvas={isActive ? "" : undefined}
                        data-slide-index={i}
                        onClick={() => setActiveSlideIndex(i)}
                      >
                        <SlideRenderer
                          design={slide.design}
                          theme={slide.theme}
                          displayWidth={440}
                          editable={isActive}
                          selection={isActive ? selection : null}
                          stackEditIndex={isActive ? stackEditIndex : null}
                          onSelect={isActive ? handleSelect : undefined}
                          onEnterStackEdit={isActive ? enterStackEdit : undefined}
                          onElementChange={isActive ? updateElement : undefined}
                          onStackChildChange={isActive ? updateStackChild : undefined}
                          onElementContextMenu={
                            isActive
                              ? (nextSelection, position) => {
                                setSelection(nextSelection);
                                setStackEditIndex(null);
                                setLayerOrderMenu({
                                  selection: nextSelection,
                                  x: position.x,
                                  y: position.y,
                                });
                              }
                              : undefined
                          }
                          onEditBegin={isActive ? pushHistory : undefined}
                          onImageDropOnShape={isActive ? maskImageIntoShape : undefined}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="flex items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 text-[14px] text-text-tertiary"
                    style={{ width: 440, height: 550 }}
                  >
                    {gen.status === "running"
                      ? "Building your carousel…"
                      : "Your slides will appear here"}
                  </div>
                )}
              </div>
            </section>

            {showThemePanel && (
              <aside
                data-inspector=""
                className="hidden w-[348px] shrink-0 overflow-y-auto border-l border-neutral-200/80 bg-background lg:block"
              >
                {selection !== null && activeSlide && (() => {
                  const el = activeSlide.design.elements[selection.elementIndex];
                  if (!el) return null;

                  if (selection.childIndex != null && el.kind === "stack") {
                    const child = el.children[selection.childIndex];
                    if (!child) return null;
                    return (
                      <StackChildInspector
                        child={child}
                        onChange={(patch) =>
                          updateStackChild(selection.elementIndex, selection.childIndex!, patch, true)
                        }
                        onImageChange={(imageId, patch) => updateSlideImage(imageId, patch, true)}
                      />
                    );
                  }

                  return (
                    <ElementInspector
                      element={el}
                      onChange={(patch) => updateElement(selection.elementIndex, patch, true)}
                      onImageChange={(imageId, patch) => updateSlideImage(imageId, patch, true)}
                      onSeparateImage={() => separateShapeImage(selection.elementIndex)}
                    />
                  );
                })()}
                <Controls
                  theme={sidebarTheme}
                  onChange={updateTheme}
                  paletteOptions={gen.generatedPalettes}
                  activePaletteId={gen.activePaletteId}
                  onSelectPalette={selectPalette}
                />
              </aside>
            )}
          </div>
        </div>
      </div>

      {gen.slides.length > 0 && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          {gen.slides.map((slide, i) => (
            <div
              key={i}
              ref={(el) => {
                exportRefs.current[i] = el;
              }}
            >
              <SlideRenderer
                design={slide.design}
                theme={slide.theme}
                displayWidth={1080}
                forExport
              />
            </div>
          ))}
        </div>
      )}

      <PostToInstagramModal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        slides={gen.slides}
        prompt={gen.prompt}
        captureSlideImages={captureSlideImages}
        returnTo={`/design/${id}?post=1`}
      />

      {layerOrderMenu && activeSlide && (() => {
        const elementCount = activeSlide.design.elements.length;
        const elementIndex = layerOrderMenu.selection.elementIndex;
        const isBack = elementIndex <= 0;
        const isFront = elementIndex >= elementCount - 1;
        return (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-pointer"
              aria-label="Close layer ordering menu"
              onClick={() => setLayerOrderMenu(null)}
            />
            <div
              data-layer-order-menu=""
              className="fixed z-50 min-w-[160px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
              style={{ left: layerOrderMenu.x, top: layerOrderMenu.y }}
            >
              <LayerOrderMenuButton
                label="Bring to front"
                disabled={isFront}
                onClick={() => reorderElementLayer("front")}
              />
              <LayerOrderMenuButton
                label="Bring to back"
                disabled={isBack}
                onClick={() => reorderElementLayer("back")}
              />
              <div className="my-1 h-px bg-neutral-100" />
              <LayerOrderMenuButton
                label="Move forward"
                disabled={isFront}
                onClick={() => reorderElementLayer("forward")}
              />
              <LayerOrderMenuButton
                label="Move backward"
                disabled={isBack}
                onClick={() => reorderElementLayer("backward")}
              />
            </div>
          </>
        );
      })()}
    </>
  );
}

function LayerOrderMenuButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full cursor-pointer px-3 py-1.5 text-left text-[13px] text-primary hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-text-tertiary disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

/** Upload an image data URL to R2 (via the API) and return its hosted URL + id. */
async function uploadImage(dataUrl: string): Promise<{ url: string; imageId: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to upload image");
  }
  return res.json() as Promise<{ url: string; imageId: string }>;
}

function ElementInspector({
  element,
  onChange,
  onImageChange,
  onSeparateImage,
}: {
  element: SlideElement;
  onChange: (patch: Partial<SlideElement>) => void;
  onImageChange: (imageId: string, patch: { url: string; prompt?: string }) => void;
  onSeparateImage: () => void;
}) {
  const num = (label: string, value: number, key: string) => (
    <div>
      <p className="mb-2 text-[12px] text-gray-700">{label}</p>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<SlideElement>)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
      />
    </div>
  );

  return (
    <SidebarSection
      title="Element"
      description=""
    >
      <div className="flex flex-col gap-3">
        {element.kind === "image" && (
          <ImageInspectorFields
            imageId={element.imageId}
            fit={element.fit}
            borderRadius={element.borderRadius}
            opacity={element.opacity ?? 1}
            onFitChange={(fit) => onChange({ fit } as Partial<SlideElement>)}
            onBorderRadiusChange={(borderRadius) => onChange({ borderRadius } as Partial<SlideElement>)}
            onOpacityChange={(opacity) => onChange({ opacity } as Partial<SlideElement>)}
            onImageChange={onImageChange}
          />
        )}
        {element.kind === "shape" && (
          <ShapeInspectorFields
            element={element}
            onChange={onChange}
            onImageChange={onImageChange}
            onSeparateImage={onSeparateImage}
          />
        )}
        {element.kind === "stack" && (
          <>
            {num("Gap", element.gap, "gap")}
            {num("Padding X", element.paddingX, "paddingX")}
            {num("Padding Y", element.paddingY, "paddingY")}
            <SelectField
              label="Direction"
              value={element.direction}
              options={[
                { value: "column", label: "Column" },
                { value: "row", label: "Row" },
              ]}
              onChange={(value) => onChange({ direction: value as "column" | "row" })}
            />
            <SelectField
              label="Align items"
              value={element.alignItems}
              options={[
                { value: "start", label: "Start" },
                { value: "center", label: "Center" },
                { value: "end", label: "End" },
                { value: "stretch", label: "Stretch" },
              ]}
              onChange={(value) =>
                onChange({ alignItems: value as "start" | "center" | "end" | "stretch" })
              }
            />
            <SelectField
              label="Justify content"
              value={element.justifyContent}
              options={[
                { value: "start", label: "Start" },
                { value: "center", label: "Center" },
                { value: "end", label: "End" },
                { value: "space-between", label: "Space between" },
              ]}
              onChange={(value) =>
                onChange({
                  justifyContent: value as "start" | "center" | "end" | "space-between",
                })
              }
            />
          </>
        )}
        {element.kind === "text" && (
          <>
            {num("Font size", element.fontSize, "fontSize")}
            {num("Weight", element.fontWeight, "fontWeight")}
            <div>
              <p className="mb-2 text-[12px] text-gray-700">Align</p>
              <div className="relative">
                <select
                  value={element.align}
                  onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
                  className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2.5 pl-3 pr-9 text-[13px] font-medium capitalize text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarSection>
  );
}

function ReplaceImageField({
  imageId,
  onImageChange,
}: {
  imageId: string;
  onImageChange: (imageId: string, patch: { url: string; prompt?: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readImageFile(file);
      const { url } = await uploadImage(dataUrl);
      onImageChange(imageId, { url, prompt: file.name });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-[12px] text-gray-700">Replace image</p>
      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
        {uploading ? "Uploading…" : "Choose file…"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}

function ImageInspectorFields({
  imageId,
  fit,
  borderRadius,
  opacity,
  onFitChange,
  onBorderRadiusChange,
  onOpacityChange,
  onImageChange,
}: {
  imageId: string;
  fit: "cover" | "contain";
  borderRadius: number;
  opacity: number;
  onFitChange: (fit: "cover" | "contain") => void;
  onBorderRadiusChange: (borderRadius: number) => void;
  onOpacityChange: (opacity: number) => void;
  onImageChange: (imageId: string, patch: { url: string; prompt?: string }) => void;
}) {
  return (
    <>
      <ReplaceImageField imageId={imageId} onImageChange={onImageChange} />
      <SelectField
        label="Fit"
        value={fit}
        options={[
          { value: "cover", label: "Cover" },
          { value: "contain", label: "Contain" },
        ]}
        onChange={(value) => onFitChange(value as "cover" | "contain")}
      />
      <div>
        <p className="mb-2 text-[12px] text-gray-700">Border radius</p>
        <input
          type="number"
          value={Math.round(borderRadius)}
          onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[12px] text-gray-700">Opacity</p>
          <span className="text-[12px] font-medium text-text-tertiary">
            {Math.round((opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round((opacity ?? 1) * 100)}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          className="w-full accent-neutral-900"
          aria-label="Image opacity"
        />
      </div>
    </>
  );
}

function ShapeInspectorFields({
  element,
  onChange,
  onImageChange,
  onSeparateImage,
}: {
  element: ShapeElement;
  onChange: (patch: Partial<SlideElement>) => void;
  onImageChange: (imageId: string, patch: { url: string; prompt?: string }) => void;
  onSeparateImage: () => void;
}) {
  const hasImage = Boolean(element.imageId);
  return (
    <>
      <SelectField
        label="Shape"
        value={element.variant}
        options={SHAPE_VARIANTS.map((v) => ({ value: v.id, label: v.label }))}
        onChange={(value) => onChange({ variant: value as ShapeVariant })}
      />
      {hasImage ? (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100">
              <ElementKindIcon kind="image" className="h-5 w-5 text-gray-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text-base">Masked image</p>
              <p className="truncate text-[12px] text-gray-700">Clipped to this shape</p>
            </div>
          </div>
          <SelectField
            label="Image fit"
            value={element.fit ?? "cover"}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
            onChange={(value) => onChange({ fit: value as "cover" | "contain" })}
          />
          {element.imageId && (
            <ReplaceImageField imageId={element.imageId} onImageChange={onImageChange} />
          )}
          <button
            type="button"
            onClick={onSeparateImage}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50"
          >
            <SeparateIcon className="h-4 w-4" />
            Separate image
          </button>
        </>
      ) : (
        <>
          <SelectField
            label="Color"
            value={element.color}
            options={[
              { value: "accent", label: "Accent" },
              { value: "background", label: "Background" },
              { value: "text", label: "Text" },
            ]}
            onChange={(value) => onChange({ color: value })}
          />
          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[12px] leading-relaxed text-gray-700">
            Drag an image onto this shape to mask it into the shape.
          </p>
        </>
      )}
    </>
  );
}

function StackChildInspector({
  child,
  onChange,
  onImageChange,
}: {
  child: StackChild;
  onChange: (patch: Partial<StackChild>) => void;
  onImageChange: (imageId: string, patch: { url: string; prompt?: string }) => void;
}) {
  const num = (label: string, value: number, key: string) => (
    <div>
      <p className="mb-2 text-[12px] text-gray-700">{label}</p>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<StackChild>)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
      />
    </div>
  );

  const descriptions: Record<StackChild["kind"], string> = {
    text: "Edit typography and dimensions for this stack item.",
    image: "Adjust the size of this stack image.",
    shape: "Adjust the size of this stack shape.",
  };

  return (
    <SidebarSection title="Stack item" description={descriptions[child.kind]}>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <ElementKindIcon kind={child.kind} className="h-5 w-5 text-gray-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium capitalize text-text-base">{child.kind}</p>
          <p className="truncate text-[12px] text-gray-700">
            {child.kind === "text"
              ? child.content.slice(0, 40)
              : `${child.width}×${"height" in child ? child.height : "—"}px`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {child.kind === "text" && (
          <div>
            <p className="mb-2 text-[12px] text-gray-700">Content</p>
            <textarea
              value={child.content}
              onChange={(e) =>
                onChange({ content: e.target.value, segments: undefined } as Partial<StackChild>)
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
            />
          </div>
        )}
        {child.kind === "image" && (
          <ImageInspectorFields
            imageId={child.imageId}
            fit={child.fit}
            borderRadius={child.borderRadius}
            opacity={child.opacity ?? 1}
            onFitChange={(fit) => onChange({ fit } as Partial<StackChild>)}
            onBorderRadiusChange={(borderRadius) => onChange({ borderRadius } as Partial<StackChild>)}
            onOpacityChange={(opacity) => onChange({ opacity } as Partial<StackChild>)}
            onImageChange={onImageChange}
          />
        )}
        {num("Width", child.width, "width")}
        {child.kind !== "text" && num("Height", child.height, "height")}
        {child.kind === "text" && (
          <>
            {num("Font size", child.fontSize, "fontSize")}
            {num("Weight", child.fontWeight, "fontWeight")}
            <SelectField
              label="Align"
              value={child.align}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
              onChange={(value) => onChange({ align: value as "left" | "center" | "right" })}
            />
          </>
        )}
      </div>
    </SidebarSection>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-gray-700">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2.5 pl-3 pr-9 text-[13px] font-medium capitalize text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      </div>
    </div>
  );
}

function ElementKindIcon({
  kind,
  className,
}: {
  kind: SlideElement["kind"] | StackChild["kind"];
  className?: string;
}) {
  if (kind === "stack") return <Layers className={className} aria-hidden />;
  if (kind === "text") return <Type className={className} aria-hidden />;
  if (kind === "image") return <ImageIcon className={className} aria-hidden />;
  return <Square className={className} aria-hidden />;
}

function ShapePlusIcon({ className }: { className?: string }) {
  return <SquarePlus className={className} aria-hidden />;
}

function SeparateIcon({ className }: { className?: string }) {
  return <Ungroup className={className} aria-hidden />;
}

/** Small filled preview of a shape variant for the "Add shape" menu. */
function ShapeGlyph({ variant, className }: { variant: ShapeVariant; className?: string }) {
  const clip = shapeClipPath(variant);
  const radius =
    variant === "circle" || variant === "pill"
      ? "9999px"
      : variant === "rect"
        ? "3px"
        : "0";
  return (
    <span className={className} style={{ display: "inline-block" }} aria-hidden>
      <span
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          background: "currentColor",
          borderRadius: radius,
          clipPath: clip,
          WebkitClipPath: clip,
        }}
      />
    </span>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <ChevronDown className={className} aria-hidden />;
}

function EllipsisIcon({ className }: { className?: string }) {
  return <Ellipsis className={className} aria-hidden />;
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
