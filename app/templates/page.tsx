"use client";

import TemplatePreviewSheet from "@/components/templates/TemplatePreviewSheet";
import TemplateSection from "@/components/templates/TemplateSection";
import TopNav from "@/components/templates/TopNav";
import { TEMPLATE_CATEGORIES, type CarouselTemplate } from "@/lib/templates";
import Link from "next/link";
import { useState } from "react";

export default function TemplatesPage() {
  const [contextPrompt, setContextPrompt] = useState("");
  const [selected, setSelected] = useState<CarouselTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "ai">("discover");

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-neutral-900">
      <TopNav />

      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Carousel templates
            </h1>
            <p className="mt-1 text-base text-[#8E8E93]">
              Pick a template, customize your prompt, add photos, and generate.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === "discover"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-800 ring-1 ring-neutral-200"
              }`}
            >
              <CompassIcon />
              Discover
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === "ai"
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-800 ring-1 ring-neutral-200"
              }`}
            >
              AI Templates
            </button>
          </div>
        </div>

        <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <label htmlFor="context-prompt" className="mb-2 block text-sm font-semibold text-neutral-900">
            Your carousel idea
          </label>
          <textarea
            id="context-prompt"
            value={contextPrompt}
            onChange={(e) => setContextPrompt(e.target.value)}
            rows={3}
            placeholder="Optional context — e.g. topic, audience, tone. This gets merged with the template prompt when you generate."
            className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-800 outline-none placeholder:text-[#8E8E93] focus:border-neutral-400 focus:bg-white"
          />
        </section>

        <main>
          {TEMPLATE_CATEGORIES.map((category) => (
            <TemplateSection
              key={category.id}
              category={category}
              onSelect={setSelected}
            />
          ))}

          <p className="pb-8 text-center text-sm text-[#8E8E93]">
            Click a template to open the preview and customize before generating.{" "}
            <Link href="/" className="underline hover:text-neutral-700">
              Open editor
            </Link>
          </p>
        </main>
      </div>

      <TemplatePreviewSheet
        template={selected}
        contextPrompt={contextPrompt}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function CompassIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8l-2.5 6.5L8 16l2.5-6.5L16 8z" />
    </svg>
  );
}
