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

  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-base font-semibold tracking-tight text-neutral-800">
          {category.title}
        </h3>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          {category.templates.length}
        </span>
      </div>
      <p className="mb-4 -mt-1.5 text-sm text-neutral-500">{category.subtitle}</p>

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
