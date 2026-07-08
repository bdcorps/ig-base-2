"use client";

import SidebarSection from "@/components/SidebarSection";
import type { BrandKit } from "@/lib/brandKit";
import { FONT_CATEGORIES, googleFontsHref } from "@/lib/fonts";
import { brandPaletteHeuristic } from "@/lib/paletteUtils";
import { PALETTE_ROLES, type Palette, type PaletteOption, type Theme } from "@/lib/schema";
import { ChevronDown, Shuffle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
  paletteOptions?: PaletteOption[];
  activePaletteId?: string | null;
  onSelectPalette?: (option: PaletteOption) => void;
  variant?: "sidebar" | "embedded";
}

const PALETTE_KEYS = PALETTE_ROLES;

function ChevronDownIcon({ className }: { className?: string }) {
  return <ChevronDown className={className} aria-hidden />;
}

/** Randomly reassign the palette's five colors across the semantic roles. */
function shufflePalette(palette: Palette): Palette {
  const values = PALETTE_KEYS.map((k) => palette[k]);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return {
    background: values[0],
    text: values[1],
    accent: values[2],
    secondary: values[3],
    neutral: values[4],
  };
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
  onApply: (palette: Palette) => void;
}) {
  const apply = () => onApply(shufflePalette(palette));
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={apply}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          apply();
        }
      }}
      title={`Shuffle & apply ${name}`}
      aria-label={`Shuffle and apply palette: ${name}`}
      aria-pressed={selected}
      className={`group relative flex h-10 w-full shrink-0 cursor-pointer overflow-hidden rounded-md transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-base/20`}
    >
      {PALETTE_KEYS.map((k) => (
        <span key={k} style={{ background: palette[k] }} className="min-w-0 flex-1" />
      ))}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm">
          <Shuffle className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
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
    //     <p className="truncate text-[12px] text-gray-700">Apply to all slides</p>
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
      <p className="mb-2 text-[12px] text-gray-700">{label}</p>
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
  const [brandPalette, setBrandPalette] = useState<PaletteOption | null>(null);

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

  // Load the user's global brand kit so its palette is always available here,
  // alongside the palettes generated for this specific design.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const json = (await res.json()) as { brandKit?: BrandKit };
        if (cancelled || !json.brandKit) return;
        setBrandPalette({
          id: "brand-kit",
          name: "Brand kit",
          palette: brandPaletteHeuristic(json.brandKit),
        });
      } catch {
        // Ignore — brand palette is optional here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      {(paletteOptions.length > 0 || brandPalette) &&
        wrap(
          "Color palettes",
          "Apply a palette to update colors across all slides.",
          <div className="flex flex-col gap-4">
            {paletteOptions.length > 0 && (
              <div className="flex flex-col gap-2">
                {brandPalette && (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    Generated for this design
                  </p>
                )}
                {paletteOptions.map((option) => (
                  <PaletteCard
                    key={option.id}
                    palette={option.palette}
                    name={option.name}
                    selected={option.id === activePaletteId}
                    onApply={(palette) => onSelectPalette?.({ ...option, palette })}
                  />
                ))}
              </div>
            )}
            {brandPalette && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  From your brand kit
                </p>
                <PaletteCard
                  palette={brandPalette.palette}
                  name={brandPalette.name}
                  selected={brandPalette.id === activePaletteId}
                  onApply={(palette) => onSelectPalette?.({ ...brandPalette, palette })}
                />
              </div>
            )}
          </div>,
        )}

      {wrap(
        "Colors",
        "Fine-tune the background, text, accent, secondary, and neutral colors for this design.",
        <div className="flex flex-col gap-3">
          {PALETTE_KEYS.map((k) => (
            <div key={k}>
              <p className="mb-2 text-[12px] capitalize text-gray-700">{k}</p>
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
