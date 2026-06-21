import type { PaletteOption } from "@/lib/schema";
import type { SlideState } from "@/lib/slideState";

export type GenerationStatus = "pending" | "running" | "complete" | "error";

export interface Generation {
  id: string;
  prompt: string;
  slideCount: number;
  status: GenerationStatus;
  slides: SlideState[];
  activeSlideIndex: number;
  generatedPalettes: PaletteOption[];
  activePaletteId: string | null;
  promptId: string | null;
  error: string | null;
  createdAt: number;
}

export function createGeneration(prompt: string, slideCount: number): Generation {
  return {
    id: crypto.randomUUID(),
    prompt,
    slideCount,
    status: "pending",
    slides: [],
    activeSlideIndex: 0,
    generatedPalettes: [],
    activePaletteId: null,
    promptId: null,
    error: null,
    createdAt: Date.now(),
  };
}

export function generationTitle(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 42)}…`;
}

export function statusDotColor(status: GenerationStatus): string {
  switch (status) {
    case "running":
      return "#3b82f6";
    case "complete":
      return "#22c55e";
    case "error":
      return "#ef4444";
    default:
      return "#a3a3a3";
  }
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
