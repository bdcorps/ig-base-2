"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { buildCover, themeFor, type CarouselTemplate } from "@/lib/templates";
import { LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface TemplateCardProps {
  template: CarouselTemplate;
  onSelect: (template: CarouselTemplate) => void;
  width?: number;
  /** When true, the card fills its container width instead of using a fixed width. */
  fluid?: boolean;
}

export default function TemplateCard({
  template,
  onSelect,
  width = 200,
  fluid = false,
}: TemplateCardProps) {
  const router = useRouter();
  const design = buildCover(template);
  const theme = themeFor(template);
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    if (!fluid) return;
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setMeasured(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fluid]);

  const renderWidth = fluid ? measured : width;

  function useTemplate() {
    router.push(`/?template=${encodeURIComponent(template.id)}`);
  }

  return (
    <div
      ref={ref}
      className={fluid ? "group w-full text-left" : "group shrink-0 text-left"}
      style={fluid ? undefined : { width }}
    >
      <button
        type="button"
        onClick={() => onSelect(template)}
        className="block w-full cursor-pointer text-left"
      >
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
          <div className="pointer-events-none transition-transform duration-300 group-hover:scale-[1.02]">
            {renderWidth > 0 ? (
              <SlideRenderer design={design} theme={theme} displayWidth={renderWidth} />
            ) : (
              <div className="aspect-1080/1350 w-full bg-neutral-100" />
            )}
          </div>

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
            <GridIcon />
            <span className="text-[11px] font-semibold text-white">{template.slideCount}</span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={useTemplate}
        className="mt-2 w-full cursor-pointer rounded-lg bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Use template
      </button>
    </div>
  );
}

function GridIcon() {
  return <LayoutGrid size={10} strokeWidth={2.5} className="text-white/90" />;
}
