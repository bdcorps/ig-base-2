"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { buildCover, themeFor, type CarouselTemplate } from "@/lib/templates";

interface TemplateCardProps {
  template: CarouselTemplate;
  onSelect: (template: CarouselTemplate) => void;
  width?: number;
}

export default function TemplateCard({ template, onSelect, width = 200 }: TemplateCardProps) {
  const design = buildCover(template);
  const theme = themeFor(template);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group shrink-0 cursor-pointer text-left"
      style={{ width }}
    >
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="pointer-events-none transition-transform duration-300 group-hover:scale-[1.02]">
          <SlideRenderer design={design} theme={theme} displayWidth={width} />
        </div>

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
          <GridIcon />
          <span className="text-[11px] font-semibold text-white">{template.slideCount}</span>
        </div>
      </div>

      <p className="mt-2 truncate px-0.5 text-[13px] font-medium text-neutral-700">
        {template.title}
      </p>
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/90">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
