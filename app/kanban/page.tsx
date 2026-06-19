"use client";

import Controls from "@/components/Controls";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import SlideRenderer from "@/components/SlideRenderer";
import { useKanbanJobs } from "@/hooks/useKanbanJobs";
import { saveEditorSession } from "@/lib/editorSession";
import type { KanbanJob } from "@/lib/kanban";
import type { Theme } from "@/lib/schema";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const EXAMPLE_PROMPTS = [
  "Q&A carousel: How to start a business from scratch. Friendly, approachable.",
  "Bold hook slide: zero to $300k MRR by hacking virality, 500M monthly views.",
  "Premium minimalist slide for an independent optician. Expert eyewear beats a chain store.",
];

export default function KanbanPage() {
  const router = useRouter();
  const { jobs, addJob, removeJob, retryJob } = useKanbanJobs();
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<KanbanJob | null>(null);
  const [themeOverrides, setThemeOverrides] = useState<Record<string, Theme>>({});

  const activeCount = jobs.filter((j) => j.status === "running").length;

  useEffect(() => {
    if (!selected) return;
    const fresh = jobs.find((j) => j.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [jobs, selected]);

  function submit() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    addJob(trimmed);
    setPrompt("");
  }

  function handleSelect(job: KanbanJob) {
    setSelected(job);
  }

  function getTheme(job: KanbanJob): Theme {
    return themeOverrides[job.id] ?? job.theme;
  }

  function setThemeForJob(jobId: string, theme: Theme) {
    setThemeOverrides((prev) => ({ ...prev, [jobId]: theme }));
  }

  function openInEditor(job: KanbanJob) {
    if (!job.design) return;
    saveEditorSession({
      prompt: job.prompt,
      design: job.design,
      theme: getTheme(job),
    });
    router.push("/");
  }

  const selectedTheme = selected ? getTheme(selected) : null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-[1400px] p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Carousel Kanban</h1>
            {activeCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                {activeCount} designing
              </span>
            )}
          </div>
          <Link
            href="/"
            className="text-base text-neutral-500 underline hover:text-neutral-800"
          >
            Single-slide editor
          </Link>
        </header>

        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-4">
          <label htmlFor="kanban-prompt" className="mb-2 block text-base font-medium text-neutral-800">
            New carousel prompt
          </label>
          <textarea
            id="kanban-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            placeholder="Describe a carousel slide (⌘↵ to add)"
            className="mb-3 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-base outline-none focus:border-neutral-400"
          />
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(p)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
              >
                Example {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={submit}
              disabled={!prompt.trim()}
              className="ml-auto rounded-lg bg-neutral-900 px-4 py-2.5 text-base font-semibold text-white disabled:opacity-50"
            >
              Add to board
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px]">
          <KanbanBoard
            jobs={jobs}
            onRemove={removeJob}
            onRetry={retryJob}
            onSelect={handleSelect}
            onOpenEditor={openInEditor}
            selectedId={selected?.id ?? null}
          />

          <aside className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-neutral-600">Inspector</h2>
            {selected && selected.design && selectedTheme ? (
              <>
                <p className="text-sm leading-relaxed text-neutral-600">{selected.prompt}</p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => openInEditor(selected)}
                    className="rounded-md outline-none ring-neutral-900/20 focus-visible:ring-2"
                    title="Open in editor"
                  >
                    <SlideRenderer
                      design={selected.design}
                      theme={selectedTheme}
                      displayWidth={280}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openInEditor(selected)}
                  className="w-full rounded-lg bg-neutral-900 px-3 py-2.5 text-base font-semibold text-white"
                >
                  Open in editor
                </button>
                {selected.status === "review" && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-600">Theme</h3>
                    <Controls
                      theme={selectedTheme}
                      onChange={(t) => setThemeForJob(selected.id, t)}
                    />
                  </div>
                )}
              </>
            ) : selected ? (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-base text-neutral-500">
                {selected.status === "failed"
                  ? "This slide failed. Retry from the card."
                  : "Slide is still being designed"}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-base text-neutral-500">
                Select a card to preview
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
