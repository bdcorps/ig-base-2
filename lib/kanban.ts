import type { SlideDesign, Theme } from "@/lib/schema";
import { DEFAULT_THEME } from "@/lib/fonts";

export type KanbanStage = "queued" | "designing" | "building" | "review";

export type KanbanJobStatus = "running" | "review" | "failed";

export interface KanbanJob {
  id: string;
  prompt: string;
  createdAt: number;
  status: KanbanJobStatus;
  stage: KanbanStage;
  theme: Theme;
  design: SlideDesign | null;
  error: string | null;
  elementCount: number;
  hasPalette: boolean;
}

export const KANBAN_COLUMNS: { id: KanbanStage; title: string }[] = [
  { id: "queued", title: "Queued" },
  { id: "designing", title: "Designing" },
  { id: "building", title: "Building" },
  { id: "review", title: "Review" },
];

export function createKanbanJob(prompt: string): KanbanJob {
  return {
    id: crypto.randomUUID(),
    prompt: prompt.trim(),
    createdAt: Date.now(),
    status: "running",
    stage: "queued",
    theme: { ...DEFAULT_THEME },
    design: null,
    error: null,
    elementCount: 0,
    hasPalette: false,
  };
}

/** Map streaming progress to the kanban column a card should appear in. */
export function deriveKanbanStage(
  job: Pick<KanbanJob, "status" | "design" | "elementCount" | "hasPalette">,
): KanbanStage {
  if (job.status === "review" || job.status === "failed") return "review";
  if (job.elementCount > 0) return "building";
  if (job.hasPalette || job.design?.background) return "designing";
  return "queued";
}

export function truncatePrompt(prompt: string, max = 80): string {
  const oneLine = prompt.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
