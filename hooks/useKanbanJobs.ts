"use client";

import { useCallback, useRef, useState } from "react";
import { consumeDesignStream } from "@/lib/designStream";
import {
  createKanbanJob,
  deriveKanbanStage,
  type KanbanJob,
} from "@/lib/kanban";

export function useKanbanJobs() {
  const [jobs, setJobs] = useState<KanbanJob[]>([]);
  const abortControllers = useRef(new Map<string, AbortController>());

  const updateJob = useCallback((id: string, patch: Partial<KanbanJob>) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;
        const next = { ...job, ...patch };
        return { ...next, stage: deriveKanbanStage(next) };
      }),
    );
  }, []);

  const runJob = useCallback(
    async (job: KanbanJob) => {
      const controller = new AbortController();
      abortControllers.current.set(job.id, controller);

      try {
        await consumeDesignStream(
          job.prompt,
          (update) => {
            if (update.type === "palette") {
              updateJob(job.id, { theme: update.theme, hasPalette: true });
            } else if (update.type === "design") {
              updateJob(job.id, {
                design: update.design,
                elementCount: update.design.elements.length,
              });
            } else if (update.type === "error") {
              updateJob(job.id, { status: "failed", error: update.message });
            } else if (update.type === "done") {
              updateJob(job.id, { status: "review" });
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        updateJob(job.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      } finally {
        abortControllers.current.delete(job.id);
      }
    },
    [updateJob],
  );

  const addJob = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      const job = createKanbanJob(trimmed);
      setJobs((prev) => [job, ...prev]);
      void runJob(job);
    },
    [runJob],
  );

  const removeJob = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const retryJob = useCallback(
    (id: string) => {
      let reset: KanbanJob | undefined;
      setJobs((prev) => {
        const existing = prev.find((j) => j.id === id);
        if (!existing) return prev;
        reset = { ...createKanbanJob(existing.prompt), id, createdAt: Date.now() };
        return prev.map((j) => (j.id === id ? reset! : j));
      });
      if (reset) void runJob(reset);
    },
    [runJob],
  );

  return { jobs, addJob, removeJob, retryJob };
}
