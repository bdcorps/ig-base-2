"use client";

import type { TemplateCategory } from "@/lib/templates";
import type { CarouselTemplate } from "@/lib/templates";
import TemplateCard from "./TemplateCard";

interface TemplateSectionProps {
  category: TemplateCategory;
  onSelect: (template: CarouselTemplate) => void;
}

export default function TemplateSection({ category, onSelect }: TemplateSectionProps) {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {category.title}
          </h2>
          <p className="mt-1 text-sm text-[#8E8E93]">{category.subtitle}</p>
        </div>
        <button
          type="button"
          className="shrink-0 text-sm font-medium text-[#8E8E93] hover:text-neutral-700"
        >
          See all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {category.templates.map((template) => (
          <TemplateCard key={template.id} template={template} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
