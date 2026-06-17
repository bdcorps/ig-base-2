"use client";

import { useState } from "react";
import SlideRenderer from "@/components/SlideRenderer";
import Controls from "@/components/Controls";
import { DEFAULT_THEME } from "@/lib/fonts";
import type { Background, SlideDesign, SlideElement, Theme } from "@/lib/schema";
import type { DesignEvent } from "@/app/api/design/route";

const EXAMPLE_PROMPTS = [
  "Q&A carousel: How to start a business from scratch (if you've never done it before). Friendly, approachable.",
  "Bold hook slide: This girl went from zero to $300k MRR by hacking virality and got 500M monthly views.",
  "Premium minimalist slide for an independent optician — why expert eyewear beats a chain store.",
];

export default function Home() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [design, setDesign] = useState<SlideDesign | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setSelected(null);
    setDesign(null);

    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Last entry may be an incomplete line — keep it in the buffer.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: DesignEvent;
          try {
            event = JSON.parse(line) as DesignEvent;
          } catch {
            continue;
          }

          if (event.type === "palette") {
            setTheme((t) => ({ ...t, palette: event.data }));
          } else if (event.type === "background") {
            setDesign((d) => ({
              background: event.data as Background,
              elements: d?.elements ?? [],
              images: d?.images ?? {},
            }));
          } else if (event.type === "element") {
            setDesign((d) => ({
              background: d?.background ?? { type: "solid", color: "background" },
              elements: [...(d?.elements ?? []), event.data as SlideElement],
              images: d?.images ?? {},
            }));
          } else if (event.type === "image") {
            const { imageId, dataUrl, prompt: imgPrompt } = event.data;
            setDesign((d) => ({
              background: d?.background ?? { type: "solid", color: "background" },
              elements: d?.elements ?? [],
              images: { ...(d?.images ?? {}), [imageId]: { dataUrl, prompt: imgPrompt } },
            }));
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
          // "done" — nothing to do; the stream will end naturally.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function updateElement(index: number, patch: Partial<SlideElement>) {
    setDesign((d) =>
      d
        ? {
            ...d,
            elements: d.elements.map((el, i) =>
              i === index ? ({ ...el, ...patch } as SlideElement) : el,
            ),
          }
        : d,
    );
  }

  function deleteElement(index: number) {
    setDesign((d) =>
      d ? { ...d, elements: d.elements.filter((_, i) => i !== index) } : d,
    );
    setSelected(null);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 p-6 lg:grid-cols-[1fr_440px_300px]">
        {/* Prompt column */}
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">Carousel Design Agent</h1>
          <p className="text-sm text-neutral-400">
            Describe the slide. The agent designs a 1080×1350 layout — then drag elements on
            the canvas to fine-tune, and re-skin instantly.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm outline-none focus:border-neutral-600"
            placeholder="Describe your carousel slide…"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:border-neutral-600"
              >
                Example {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="rounded-lg bg-white px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50"
          >
            {loading ? "Designing…" : "Generate slide"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {design && (
            <button
              onClick={() => setShowJson((v) => !v)}
              className="self-start text-xs text-neutral-500 underline"
            >
              {showJson ? "Hide" : "Show"} JSON
            </button>
          )}
          {showJson && design && (
            <pre className="max-h-80 overflow-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-[10px] leading-tight text-neutral-400">
              {JSON.stringify(redactImages(design), null, 2)}
            </pre>
          )}
        </section>

        {/* Preview / editor column */}
        <section className="flex flex-col items-center gap-3">
          <h2 className="self-start text-sm font-semibold text-neutral-400">
            Canvas {design ? "· drag to move, corner to resize" : ""}
          </h2>
          {design ? (
            <SlideRenderer
              design={design}
              theme={theme}
              displayWidth={440}
              editable
              selectedIndex={selected}
              onSelect={setSelected}
              onElementChange={updateElement}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-neutral-800 text-sm text-neutral-600"
              style={{ width: 440, height: 550 }}
            >
              {loading ? "Designing…" : "Your slide will appear here"}
            </div>
          )}
        </section>

        {/* Controls column */}
        <section className="flex flex-col gap-6">
          {design && selected !== null && design.elements[selected] && (
            <ElementInspector
              element={design.elements[selected]}
              onChange={(patch) => updateElement(selected, patch)}
              onDelete={() => deleteElement(selected)}
            />
          )}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-400">Theme</h2>
            <Controls theme={theme} onChange={setTheme} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ElementInspector({
  element,
  onChange,
  onDelete,
}: {
  element: SlideElement;
  onChange: (patch: Partial<SlideElement>) => void;
  onDelete: () => void;
}) {
  const num = (label: string, value: number, key: string) => (
    <label className="flex items-center justify-between gap-2">
      <span className="text-neutral-400">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<SlideElement>)}
        className="w-20 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
      />
    </label>
  );

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold capitalize text-neutral-300">{element.kind} element</h2>
        <button onClick={onDelete} className="text-xs text-red-400 hover:underline">
          Delete
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {num("X", element.x, "x")}
        {num("Y", element.y, "y")}
        {num("Width", element.width, "width")}
        {element.kind !== "text" && num("Height", (element as { height: number }).height, "height")}
        {element.kind === "text" && (
          <>
            {num("Font size", element.fontSize, "fontSize")}
            {num("Weight", element.fontWeight, "fontWeight")}
            <label className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Align</span>
              <select
                value={element.align}
                onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
                className="w-24 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

/** Shrink base64 image data in the JSON debug view. */
function redactImages(design: SlideDesign) {
  const images = Object.fromEntries(
    Object.entries(design.images).map(([k, v]) => [
      k,
      { prompt: v.prompt, dataUrl: `${v.dataUrl.slice(0, 32)}… (${v.dataUrl.length} chars)` },
    ]),
  );
  return { ...design, images };
}
