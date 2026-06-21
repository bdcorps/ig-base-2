"use client";

import type { CarouselTemplate } from "@/lib/templates";

interface TemplateCardProps {
  template: CarouselTemplate;
  onSelect: (template: CarouselTemplate) => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const overlayText =
    template.overlayLabel ?? template.badge ?? template.title.toUpperCase();
  const slideCount = template.slideCount ?? 8;
  const creatorName = template.creatorName ?? "Carousel Studio";
  const creatorAvatar =
    template.creatorAvatar ??
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=64&h=64&q=80";

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group w-[168px] shrink-0 text-left"
    >
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.previewImage}
          alt={template.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-x-0 top-0 p-3">
          <p className="text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {overlayText}
          </p>
        </div>

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 backdrop-blur-sm">
          <GridIcon />
          <span className="text-[11px] font-semibold text-white">{slideCount}</span>
        </div>

        {template.isNew && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-[#FFD60A] px-1.5 py-0.5 text-[10px] font-bold text-neutral-900">
            New
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 px-0.5">
        <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={creatorAvatar} alt="" className="h-full w-full object-cover" />
        </div>
        <span className="truncate text-xs font-medium text-neutral-700">{creatorName}</span>
      </div>
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
