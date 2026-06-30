import type { DesignEvent } from "@/lib/designEvents";
import {
  applyDesignEvent,
  emptySlideState,
  filterEmptySlides,
  type SlideState,
} from "@/lib/slideState";
import type { Generation } from "@/lib/generations";

export async function streamDesign(
  prompt: string,
  slideCount: number,
  onUpdate: (patch: Partial<Generation>) => void,
  templateId?: string | null,
): Promise<void> {
  onUpdate({
    status: "running",
    error: null,
    slides: [],
    activeSlideIndex: 0,
    generatedPalettes: [],
    activePaletteId: null,
  });

  const res = await fetch("/api/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, slideCount, templateId: templateId ?? undefined }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentSlides: SlideState[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: DesignEvent;
      try {
        event = JSON.parse(line) as DesignEvent;
      } catch {
        continue;
      }

      if (event.type === "slideStart") {
        currentSlides = applyDesignEvent(currentSlides, {
          type: "slideStart",
          data: event.data,
        });
        onUpdate({
          slides: [...currentSlides],
          activeSlideIndex: event.data.index,
        });
      } else if (event.type === "palette") {
        currentSlides = applyDesignEvent(currentSlides, {
          type: "palette",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        onUpdate({
          slides: [...currentSlides],
          activeSlideIndex: event.slideIndex,
        });
      } else if (event.type === "background") {
        currentSlides = applyDesignEvent(currentSlides, {
          type: "background",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        onUpdate({
          slides: [...currentSlides],
          activeSlideIndex: event.slideIndex,
        });
      } else if (event.type === "element") {
        currentSlides = applyDesignEvent(currentSlides, {
          type: "element",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        onUpdate({
          slides: [...currentSlides],
          activeSlideIndex: event.slideIndex,
        });
      } else if (event.type === "image") {
        currentSlides = applyDesignEvent(currentSlides, {
          type: "image",
          data: event.data,
        });
        onUpdate({ slides: [...currentSlides] });
      } else if (event.type === "paletteOptions") {
        onUpdate({
          generatedPalettes: event.data.palettes,
          activePaletteId: event.data.selectedPaletteId,
        });
      } else if (event.type === "promptMeta") {
        onUpdate({ promptId: event.data.promptId });
      } else if (event.type === "error") {
        throw new Error(event.message);
      } else if (event.type === "done") {
        if (currentSlides.length === 0) {
          currentSlides = [emptySlideState()];
        } else {
          const pruned = filterEmptySlides(currentSlides);
          if (pruned.length > 0) {
            currentSlides = pruned;
          }
        }
        onUpdate({ slides: [...currentSlides] });
      }
    }
  }

  onUpdate({ status: "complete" });
}
