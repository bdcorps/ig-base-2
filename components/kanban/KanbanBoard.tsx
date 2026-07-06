"use client";

import SlideRenderer from "@/components/SlideRenderer";
import {
  KANBAN_COLUMNS,
  truncatePrompt,
  type KanbanJob,
  type KanbanStage,
} from "@/lib/kanban";

interface Props {
  jobs: KanbanJob[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect: (job: KanbanJob) => void;
  onOpenEditor: (job: KanbanJob) => void;
  selectedId: string | null;
}

export default function KanbanBoard({
  jobs,
  onRemove,
  onRetry,
  onSelect,
  onOpenEditor,
  selectedId,
}: Props) {
  const byStage = (stage: KanbanStage) =>
    jobs.filter((j) => j.stage === stage).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnJobs = byStage(col.id);
        return (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-white"
          >
            <header className="border-b border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-800">{col.title}</h2>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-sm text-neutral-600">
                  {columnJobs.length}
                </span>
              </div>
            </header>

            <div className="flex min-h-[420px] flex-col gap-3 p-3">
              {columnJobs.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No slides here</p>
              ) : (
                columnJobs.map((job) => (
                  <KanbanCard
                    key={job.id}
                    job={job}
                    selected={selectedId === job.id}
                    onSelect={() => onSelect(job)}
                    onOpenEditor={() => onOpenEditor(job)}
                    onRemove={() => onRemove(job.id)}
                    onRetry={() => onRetry(job.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  job,
  selected,
  onSelect,
  onOpenEditor,
  onRemove,
  onRetry,
}: {
  job: KanbanJob;
  selected: boolean;
  onSelect: () => void;
  onOpenEditor: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isRunning = job.status === "running";
  const isFailed = job.status === "failed";
  const isReady = job.status === "review";

  return (
    <article
      className={`rounded-lg border bg-neutral-50 transition-all duration-300 ${
        selected
          ? "border-neutral-900 ring-1 ring-neutral-900/10"
          : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      <div className="p-3">
        <button type="button" onClick={onSelect} className="w-full cursor-pointer text-left">
          <div className="mb-2 flex items-start justify-between gap-2">
            <StatusBadge running={isRunning} failed={isFailed} ready={isReady} />
            {isRunning && (
              <span className="text-xs text-neutral-500">
                {job.elementCount > 0
                  ? `${job.elementCount} element${job.elementCount === 1 ? "" : "s"}`
                  : job.design?.background
                    ? "Layout set"
                    : "Starting…"}
              </span>
            )}
          </div>

          <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-neutral-700">
            {truncatePrompt(job.prompt, 120)}
          </p>
        </button>

        <div className="flex flex-col items-center gap-2">
          {job.design ? (
            <button
              type="button"
              onClick={onOpenEditor}
              className="group relative cursor-pointer rounded-md outline-none ring-neutral-900/20 focus-visible:ring-2"
              title="Open in editor"
            >
              <SlideRenderer
                design={job.design}
                theme={job.theme}
                displayWidth={200}
              />
              <span className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-md bg-linear-to-t from-black/60 to-transparent pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-neutral-900">
                  Open in editor
                </span>
              </span>
            </button>
          ) : (
            <div
              className="flex items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-500"
              style={{ width: 200, height: 250 }}
            >
              {isRunning ? (
                <span className="animate-pulse">Designing…</span>
              ) : isFailed ? (
                "Failed"
              ) : (
                "Empty"
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
        <time className="text-xs text-neutral-500">
          {new Date(job.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <div className="flex gap-2">
          {isFailed && (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer text-xs text-neutral-600 hover:text-neutral-900"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="cursor-pointer text-xs text-neutral-500 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </footer>

      {isFailed && job.error && (
        <p className="border-t border-neutral-200 px-3 py-2 text-xs leading-snug text-red-600">
          {job.error}
        </p>
      )}
    </article>
  );
}

function StatusBadge({
  running,
  failed,
  ready,
}: {
  running: boolean;
  failed: boolean;
  ready: boolean;
}) {
  if (failed) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Failed
      </span>
    );
  }
  if (ready) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Ready
      </span>
    );
  }
  if (running) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
        In progress
      </span>
    );
  }
  return null;
}
