"use client";

import { useEffect } from "react";
import type { Palette, Theme } from "@/lib/schema";
import { GOOGLE_FONTS, PRESET_PALETTES, googleFontsHref } from "@/lib/fonts";

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export default function Controls({ theme, onChange }: Props) {
  // Inject / update the Google Fonts <link> whenever selected fonts change.
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

  const setPalette = (palette: Palette) => onChange({ ...theme, palette });
  const setColor = (key: keyof Palette, value: string) =>
    onChange({ ...theme, palette: { ...theme.palette, [key]: value } });
  const setFont = (key: keyof Theme["fonts"], value: string) =>
    onChange({ ...theme, fonts: { ...theme.fonts, [key]: value } });

  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <h3 className="mb-2 font-semibold text-neutral-300">Palette presets</h3>
        <div className="flex flex-wrap gap-2">
          {PRESET_PALETTES.map((p) => (
            <button
              key={p.name}
              onClick={() => setPalette(p.palette)}
              className="flex items-center gap-2 rounded-md border border-neutral-700 px-2 py-1 hover:border-neutral-400"
              title={p.name}
            >
              <span className="flex">
                {(["background", "text", "accent"] as const).map((k) => (
                  <span
                    key={k}
                    style={{ background: p.palette[k] }}
                    className="h-4 w-4 rounded-full border border-black/20 -ml-1 first:ml-0"
                  />
                ))}
              </span>
              <span className="text-xs">{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-neutral-300">Colors</h3>
        <div className="flex flex-col gap-2">
          {(["background", "text", "accent"] as const).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3">
              <span className="capitalize text-neutral-400">{k}</span>
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.palette[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
                />
                <input
                  type="text"
                  value={theme.palette[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  className="w-24 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-xs"
                />
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-neutral-300">Fonts</h3>
        <div className="flex flex-col gap-2">
          {(["heading", "body"] as const).map((role) => (
            <label key={role} className="flex items-center justify-between gap-3">
              <span className="capitalize text-neutral-400">{role}</span>
              <select
                value={theme.fonts[role]}
                onChange={(e) => setFont(role, e.target.value)}
                className="w-44 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
              >
                {GOOGLE_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
