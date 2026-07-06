"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { googleFontsHref } from "@/lib/fonts";
import {
  buildCover,
  findTemplate,
  TEMPLATE_GROUPS,
  templateFontFamilies,
  themeFor,
  type CarouselTemplate,
} from "@/lib/templates";
import { Check, ChevronDown, LayoutTemplate, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  templateId: string | null;
  onChange: (id: string | null) => void;
}

export default function TemplatePicker({ templateId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = templateId ? findTemplate(templateId) : undefined;

  // Load the fonts used by template covers so the thumbnails render correctly.
  useEffect(() => {
    if (!open) return;
    const id = "template-picker-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontsHref(templateFontFamilies());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[220px] cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[13px] text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
      >
        <LayoutTemplate className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          {selected ? selected.title : "Template"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
          />

          <div className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Pick a template
                </h2>
                <p className="text-[13px] text-neutral-500">
                  Your prompt is remixed into the template&apos;s layout.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selected && (
                  <button
                    type="button"
                    onClick={() => pick(null)}
                    className="cursor-pointer text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <button
                type="button"
                onClick={() => pick(null)}
                className={`mb-6 flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-3 text-[14px] transition-colors ${
                  templateId === null
                    ? "border-neutral-900 text-neutral-900"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                }`}
              >
                No template
              </button>

              {TEMPLATE_GROUPS.map((group) => (
                <div key={group.id} className="mb-8 last:mb-0">
                  <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {group.categories.flatMap((category) =>
                      category.templates.map((template) => (
                        <TemplateThumb
                          key={template.id}
                          template={template}
                          active={template.id === templateId}
                          onSelect={() => pick(template.id)}
                        />
                      )),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateThumb({
  template,
  active,
  onSelect,
}: {
  template: CarouselTemplate;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={template.title}
      className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 transition-shadow ${
        active
          ? "ring-2 ring-neutral-900"
          : "ring-black/5 hover:ring-neutral-300"
      }`}
    >
      <SlideRenderer
        design={template.design ?? buildCover(template)}
        theme={themeFor(template)}
        displayWidth={160}
      />
      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left text-[10px] font-medium text-white">
        {template.title}
      </span>
    </button>
  );
}
