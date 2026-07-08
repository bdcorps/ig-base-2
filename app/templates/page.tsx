"use client";

import TemplatePreviewSheet from "@/components/templates/TemplatePreviewSheet";
import TemplateSection from "@/components/templates/TemplateSection";
import { googleFontsHref } from "@/lib/fonts";
import {
  TEMPLATE_GROUPS,
  templateFontFamilies,
  type CarouselTemplate,
} from "@/lib/templates";
import { useEffect, useState } from "react";

export default function TemplatesPage() {
  const [selected, setSelected] = useState<CarouselTemplate | null>(null);

  useEffect(() => {
    const id = "template-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontsHref(templateFontFamilies());
  }, []);

  return (
    <div className="min-h-full bg-white text-neutral-900">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Templates</h1>
          <p className="mt-2 max-w-full text-[15px] text-neutral-500">
            Pick a template, add your own prompt, and generate a carousel customized to your
            brand and audience.
          </p>
        </header>

        <main>
          {TEMPLATE_GROUPS.map((group) => (
            <div key={group.id} className="mb-12">
              <h2 className="mb-6 flex items-center gap-2.5 text-xl font-bold tracking-tight text-neutral-900">
                {group.title}
              </h2>
              {group.categories.map((category) => (
                <TemplateSection
                  key={category.id}
                  category={category}
                  onSelect={setSelected}
                />
              ))}
            </div>
          ))}
        </main>
      </div>

      <TemplatePreviewSheet template={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
