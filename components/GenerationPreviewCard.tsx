"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { type Generation } from "@/lib/generations";
import { useEffect, useRef, useState } from "react";

interface Props {
  generation: Generation;
  onOpen: () => void;
}

export default function GenerationPreviewCard({ generation, onOpen }: Props) {
  const firstSlide = generation.slides[0];
  const isBusy = generation.status === "pending" || generation.status === "running";
  const ref = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      className="group relative aspect-1080/1350 w-full overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-200 transition hover:ring-neutral-300"
    >
      {firstSlide && width > 0 ? (
        <SlideRenderer
          design={firstSlide.design}
          theme={firstSlide.theme}
          displayWidth={width}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {isBusy ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          ) : null}
        </div>
      )}
    </button>
  );
}
