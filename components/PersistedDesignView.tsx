"use client";

import SlideRenderer from "@/components/SlideRenderer";
import type { AssembledDesign } from "@/lib/designAssembly";
import { useState } from "react";

interface Props {
  prompt: string;
  design: AssembledDesign;
}

export default function PersistedDesignView({ prompt, design }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = design.slides;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-[1200px] p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Design</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-neutral-600">
            {prompt}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {slides.length} slide{slides.length === 1 ? "" : "s"}
          </p>
        </header>

        {slides.length === 0 ? (
          <p className="text-neutral-500">No slides saved for this design yet.</p>
        ) : (
          <div className="flex flex-col items-center gap-10">
            {slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl outline-none ring-neutral-900/20 focus-visible:ring-2"
                aria-label={`Slide ${i + 1}`}
              >
                <span className="text-sm font-medium text-neutral-500">
                  Slide {i + 1}
                  {i === activeIndex ? " (selected)" : ""}
                </span>
                <SlideRenderer
                  design={slide.design}
                  theme={slide.theme}
                  displayWidth={440}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
