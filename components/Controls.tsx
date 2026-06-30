"use client";

import SidebarSection from "@/components/SidebarSection";
import { FONT_CATEGORIES, googleFontsHref } from "@/lib/fonts";
import type { Palette, PaletteOption, Theme } from "@/lib/schema";
import { useEffect, type ReactNode } from "react";

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
  paletteOptions?: PaletteOption[];
  activePaletteId?: string | null;
  onSelectPalette?: (option: PaletteOption) => void;
  variant?: "sidebar" | "embedded";
}

const PALETTE_KEYS = ["background", "text", "accent"] as const;

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PaletteCard({
  palette,
  name,
  selected,
  onApply,
}: {
  palette: Palette;
  name: string;
  selected: boolean;
  onApply: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onApply}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onApply();
        }
      }}
      title={`Apply ${name}`}
      aria-label={`Apply palette: ${name}`}
      aria-pressed={selected}
      className={`flex h-10 w-full shrink-0 cursor-pointer overflow-hidden rounded-md transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20`}
    >
      {PALETTE_KEYS.map((k) => (
        <span key={k} style={{ background: palette[k] }} className="min-w-0 flex-1" />
      ))}
    </div>
    // <button
    //   type="button"
    //   onClick={onApply}
    //   title={`Apply ${name}`}
    //   aria-label={`Apply palette: ${name}`}
    //   aria-pressed={selected}
    //   className={`flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20 ${
    //     selected ? "border-text-base ring-1 ring-text-base/10" : "border-neutral-200"
    //   }`}
    // >
    //   <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-md border border-neutral-200/80">
    //     {PALETTE_KEYS.map((k) => (
    //       <span key={k} style={{ background: palette[k] }} className="min-w-0 flex-1" />
    //     ))}
    //   </div>
    //   <div className="min-w-0 flex-1">
    //     <p className="truncate text-[13px] font-medium text-text-base">{name}</p>
    //     <p className="truncate text-[12px] text-text-secondary">Apply to all slides</p>
    //   </div>
    // </button>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-text-secondary">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2.5 pl-3 pr-9 text-[13px] font-medium text-text-base transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20"
          style={{ fontFamily: value }}
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
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      </div>
    </div>
  );
}

export default function Controls({
  theme,
  onChange,
  paletteOptions = [],
  activePaletteId = null,
  onSelectPalette,
  variant = "sidebar",
}: Props) {
  useEffect(() => {
    const id = "design-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontsHref([theme.fonts.heading, theme.fonts.body]);
  }, [theme.fonts.heading, theme.fonts.body]);

  const setColor = (key: keyof Palette, value: string) =>
    onChange({ ...theme, palette: { ...theme.palette, [key]: value } });
  const setFont = (key: keyof Theme["fonts"], value: string) =>
    onChange({ ...theme, fonts: { ...theme.fonts, [key]: value } });

  const wrap = (title: string, description: string, content: ReactNode) =>
    variant === "sidebar" ? (
      <SidebarSection title={title} description={description}>
        {content}
      </SidebarSection>
    ) : (
      <section>
        <h3 className="mb-3 text-[14px] font-semibold text-text-base">{title}</h3>
        {content}
      </section>
    );

  const sections = (
    <>
      {paletteOptions.length > 0 &&
        wrap(
          "Color palettes",
          "Choose from generated palettes to update colors across all slides.",
          <>
            <div className="flex flex-col gap-2">
              {paletteOptions.map((option) => (
                <PaletteCard
                  key={option.id}
                  palette={option.palette}
                  name={option.name}
                  selected={option.id === activePaletteId}
                  onApply={() => onSelectPalette?.(option)}
                />
              ))}
            </div>
          </>,
        )}

      {wrap(
        "Colors",
        "Fine-tune the background, text, and accent colors for this design.",
        <div className="flex flex-col gap-3">
          {PALETTE_KEYS.map((k) => (
            <div key={k}>
              <p className="mb-2 text-[12px] capitalize text-text-secondary">{k}</p>
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2">
                <input
                  type="color"
                  value={theme.palette[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={theme.palette[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-1 font-mono text-[13px] text-text-base outline-none"
                />
              </div>
            </div>
          ))}
        </div>,
      )}

      {wrap(
        "Fonts",
        "Select heading and body fonts that power your carousel typography.",
        <div className="flex flex-col gap-4">
          <FontSelect
            label="Heading"
            value={theme.fonts.heading}
            onChange={(v) => setFont("heading", v)}
          />
          <FontSelect
            label="Body"
            value={theme.fonts.body}
            onChange={(v) => setFont("body", v)}
          />
        </div>,
      )}
    </>
  );

  return variant === "sidebar" ? sections : <div className="flex flex-col gap-6">{sections}</div>;
}
