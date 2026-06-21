"use client";

import type { CarouselTemplate, TemplateCategory } from "@/lib/templates";
import { useRef } from "react";
import TemplateCard from "./TemplateCard";

interface TemplateSectionProps {
  category: TemplateCategory;
  onSelect: (template: CarouselTemplate) => void;
}

export default function TemplateSection({ category, onSelect }: TemplateSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const countLabel = category.displayCount ?? String(category.templates.length);

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: 560, behavior: "smooth" });
  };

  return (
    <section className="mb-10">
      <button
        type="button"
        className="mb-4 flex items-center gap-2 text-left transition-opacity hover:opacity-70"
      >
        <h2 className="text-lg font-semibold tracking-tight text-neutral-800">{category.title}</h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          {countLabel}
        </span>
        <ChevronRight className="text-neutral-400" />
      </button>

      <div className="relative">
        <div
          ref={scrollRef}
          className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {category.templates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`text-neutral-700 ${className}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
