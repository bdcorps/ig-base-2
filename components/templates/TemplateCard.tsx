"use client";

import type { CarouselTemplate } from "@/lib/templates";

interface TemplateCardProps {
  template: CarouselTemplate;
  onSelect: (template: CarouselTemplate) => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-[20px] text-left ring-1 ring-black/5 transition-all hover:-translate-y-0.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={template.previewImage}
        alt={template.title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-4 pt-12">
        <p className="text-sm font-semibold text-white">{template.title}</p>
      </div>

      {template.thumbnailImage && (
        <div className="absolute bottom-4 left-4 h-11 w-11 overflow-hidden rounded-lg ring-2 ring-white/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.thumbnailImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {template.badge && (
        <span className="absolute bottom-4 right-4 rounded-full bg-[#FF3B30] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
          {template.badge}
        </span>
      )}

      {template.isNew && (
        <span className="absolute left-3 top-3 -rotate-6 rounded-md bg-[#FFD60A] px-2 py-0.5 text-[11px] font-bold text-neutral-900">
          New!
        </span>
      )}
    </button>
  );
}
