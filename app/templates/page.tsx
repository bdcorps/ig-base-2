"use client";

import TemplatePreviewSheet from "@/components/templates/TemplatePreviewSheet";
import TemplateSection from "@/components/templates/TemplateSection";
import TopNav from "@/components/templates/TopNav";
import { TEMPLATE_CATEGORIES, type CarouselTemplate } from "@/lib/templates";
import { useState } from "react";

export default function TemplatesPage() {
  const [selected, setSelected] = useState<CarouselTemplate | null>(null);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <TopNav />

      <div className="mx-auto max-w-7xl px-8 py-6">
        <main>
          {TEMPLATE_CATEGORIES.map((category) => (
            <TemplateSection
              key={category.id}
              category={category}
              onSelect={setSelected}
            />
          ))}
        </main>
      </div>

      <TemplatePreviewSheet
        template={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
