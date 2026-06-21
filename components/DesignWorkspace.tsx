"use client";

import Controls from "@/components/Controls";
import SidebarSection from "@/components/SidebarSection";
import SlideRenderer, { type ElementSelection } from "@/components/SlideRenderer";
import { useGeneration } from "@/context/GenerationsContext";
import { useSlideEditHistory } from "@/hooks/useSlideEditHistory";
import { downloadSlidesAsZip } from "@/lib/exportSlides";
import { DEFAULT_THEME } from "@/lib/fonts";
import { generationTitle } from "@/lib/generations";
import type { PaletteOption, SlideDesign, SlideElement, StackChild, Theme } from "@/lib/schema";
import type { SlideState } from "@/lib/slideState";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  id: string;
}

export default function DesignWorkspace({ id }: Props) {
  const { generation, updateGeneration } = useGeneration(id);
  const [selection, setSelection] = useState<ElementSelection | null>(null);
  const [stackEditIndex, setStackEditIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const restoreSlides = useCallback(
    (slides: SlideState[]) => {
      updateGeneration(id, { slides });
    },
    [id, updateGeneration],
  );

  const { pushHistory, undo, redo, canUndo, canRedo } = useSlideEditHistory(
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
        if (selection?.childIndex != null) {
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
  }, [selection, stackEditIndex, deleteSelection, undo, redo]);

  if (!generation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-[14px] text-text-secondary">Design not found</p>
        <Link href="/" className="mt-2 text-[13px] text-text-tertiary underline hover:text-text-secondary">
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

  async function copyJson() {
    if (!activeSlide) return;
    const json = JSON.stringify(redactImages(activeSlide.design), null, 2);
    await navigator.clipboard.writeText(json);
    setMenuOpen(false);
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
    } catch (err) {
      updateGeneration(id, {
        error: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  if (gen.status === "error" && gen.slides.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="mb-3 h-2.5 w-2.5 rounded-full bg-red-500" />
        <p className="text-[14px] font-medium text-text-primary">Generation failed</p>
        <p className="mt-1 max-w-md text-[13px] text-red-600">
          {gen.error ?? "Something went wrong"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200/80 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-[14px] font-medium text-text-base">
              {generationTitle(gen.prompt)}
            </h1>
            <span className="hidden shrink-0 items-center gap-1.5 text-[13px] text-text-tertiary sm:flex">
              <FolderIcon className="h-3.5 w-3.5" />
              carousel-studio/design
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {gen.slides.length > 0 && gen.status === "complete" && (
              <>
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo"
                  title="Undo (⌘Z)"
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo"
                  title="Redo (⌘⇧Z)"
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  Redo
                </button>
              </>
            )}

            {gen.slides.length > 0 && gen.status === "complete" && (
              <button
                type="button"
                onClick={downloadZip}
                disabled={exporting}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export"}
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-neutral-100 hover:text-text-secondary"
                aria-label="More actions"
                aria-expanded={menuOpen}
              >
                <EllipsisIcon className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-neutral-200 bg-white py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={copyJson}
                      disabled={!activeSlide}
                      className="block w-full px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col items-center gap-10 px-8 py-6">
              {gen.slides.length > 0 ? (
                gen.slides.map((slide, i) => {
                  const isActive = i === gen.activeSlideIndex;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2"
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
                        onEditBegin={isActive ? pushHistory : undefined}
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
            <aside className="hidden w-[348px] shrink-0 overflow-y-auto border-l border-neutral-200/80 bg-background lg:block">
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
                    />
                  );
                }

                return (
                  <ElementInspector
                    element={el}
                    onChange={(patch) => updateElement(selection.elementIndex, patch, true)}
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
    </>
  );
}

function ElementInspector({
  element,
  onChange,
}: {
  element: SlideElement;
  onChange: (patch: Partial<SlideElement>) => void;
}) {
  const num = (label: string, value: number, key: string) => (
    <div>
      <p className="mb-2 text-[12px] text-text-secondary">{label}</p>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<SlideElement>)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
      />
    </div>
  );

  const elementDescriptions: Record<SlideElement["kind"], string> = {
    text: "Edit typography, alignment, and dimensions for this text block.",
    image: "Adjust the size and placement of this image element.",
    shape: "Adjust the size and placement of this shape element.",
    stack: "Flex container — adjust alignment and spacing for grouped children.",
  };

  return (
    <SidebarSection
      title="Element"
      description={elementDescriptions[element.kind]}
    >
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <ElementKindIcon kind={element.kind} className="h-5 w-5 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium capitalize text-text-base">
            {element.kind}
          </p>
          <p className="truncate text-[12px] text-text-secondary">
            {element.kind === "text"
              ? element.content.slice(0, 40)
              : element.kind === "stack"
                ? `${element.children.length} children · ${element.direction}`
                : `${element.width}×${"height" in element ? element.height : "—"}px`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {num("Width", element.width, "width")}
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
        {element.kind !== "text" && element.kind !== "stack" && num("Height", (element as { height: number }).height, "height")}
        {element.kind === "stack" && element.height != null && num("Height", element.height, "height")}
        {element.kind === "text" && (
          <>
            {num("Font size", element.fontSize, "fontSize")}
            {num("Weight", element.fontWeight, "fontWeight")}
            <div>
              <p className="mb-2 text-[12px] text-text-secondary">Align</p>
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

function StackChildInspector({
  child,
  onChange,
}: {
  child: StackChild;
  onChange: (patch: Partial<StackChild>) => void;
}) {
  const num = (label: string, value: number, key: string) => (
    <div>
      <p className="mb-2 text-[12px] text-text-secondary">{label}</p>
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
          <ElementKindIcon kind={child.kind} className="h-5 w-5 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium capitalize text-text-base">{child.kind}</p>
          <p className="truncate text-[12px] text-text-secondary">
            {child.kind === "text"
              ? child.content.slice(0, 40)
              : `${child.width}×${"height" in child ? child.height : "—"}px`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
      <p className="mb-2 text-[12px] text-text-secondary">{label}</p>
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
  if (kind === "stack") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }
  if (kind === "text") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h14" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
    </svg>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function redactImages(design: SlideDesign) {
  const images = Object.fromEntries(
    Object.entries(design.images).map(([k, v]) => [
      k,
      { prompt: v.prompt, dataUrl: `${v.dataUrl.slice(0, 32)}… (${v.dataUrl.length} chars)` },
    ]),
  );
  return { ...design, images };
}
