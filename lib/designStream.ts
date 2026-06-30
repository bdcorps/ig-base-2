import type { DesignEvent } from "@/lib/designEvents";
import { DEFAULT_THEME } from "@/lib/fonts";
import {
  applyDesignEvent,
  emptySlideState,
  filterEmptySlides,
  type SlideState,
} from "@/lib/slideState";

export type DesignStreamUpdate =
  | { type: "slides"; slides: SlideState[]; activeIndex: number }
  | { type: "error"; message: string }
  | { type: "done"; slideCount: number };

export interface UserImageInput {
  dataUrl: string;
  name?: string;
}

export async function consumeDesignStream(
  prompt: string,
  onUpdate: (update: DesignStreamUpdate) => void,
  signal?: AbortSignal,
  userImages?: UserImageInput[],
  slideCount?: number,
  templateId?: string,
): Promise<void> {
  const res = await fetch("/api/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      userImages: userImages?.length ? userImages : undefined,
      slideCount,
      templateId,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`);
  }

  let slides: SlideState[] = [];
  let activeIndex = 0;

  const emitSlides = () =>
    onUpdate({ type: "slides", slides: [...slides], activeIndex });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
        activeIndex = event.data.index;
        slides = applyDesignEvent(slides, {
          type: "slideStart",
          data: event.data,
        });
        emitSlides();
      } else if (event.type === "palette") {
        slides = applyDesignEvent(slides, {
          type: "palette",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        activeIndex = event.slideIndex;
        emitSlides();
      } else if (event.type === "background") {
        slides = applyDesignEvent(slides, {
          type: "background",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        activeIndex = event.slideIndex;
        emitSlides();
      } else if (event.type === "element") {
        slides = applyDesignEvent(slides, {
          type: "element",
          slideIndex: event.slideIndex,
          data: event.data,
        });
        activeIndex = event.slideIndex;
        emitSlides();
      } else if (event.type === "image") {
        slides = applyDesignEvent(slides, {
          type: "image",
          data: event.data,
        });
        emitSlides();
      } else if (event.type === "error") {
        onUpdate({ type: "error", message: event.message });
        return;
      } else if (event.type === "done") {
        if (slides.length === 0) {
          slides = [emptySlideState()];
        } else {
          const pruned = filterEmptySlides(slides);
          if (pruned.length > 0) {
            slides = pruned;
          }
        }
        emitSlides();
        onUpdate({ type: "done", slideCount: event.slideCount });
        return;
      }
    }
  }

  if (slides.length === 0) {
    slides = [emptySlideState()];
  } else {
    const pruned = filterEmptySlides(slides);
    if (pruned.length > 0) {
      slides = pruned;
    }
  }
  onUpdate({ type: "done", slideCount: slides.length });
}

/** Legacy single-slide consumer — returns the first slide's design + theme. */
export async function consumeDesignStreamLegacy(
  prompt: string,
  onUpdate: (update: {
    type: "palette";
    theme: SlideState["theme"];
  } | {
    type: "design";
    design: SlideState["design"];
  } | {
    type: "error";
    message: string;
  } | {
    type: "done";
  }) => void,
  signal?: AbortSignal,
  userImages?: UserImageInput[],
): Promise<void> {
  let theme: SlideState["theme"] = { ...DEFAULT_THEME };
  let design = emptySlideState().design;

  await consumeDesignStream(
    prompt,
    (update) => {
      if (update.type === "slides") {
        const slide = update.slides[update.activeIndex] ?? update.slides[0];
        if (slide) {
          theme = slide.theme;
          design = slide.design;
          onUpdate({ type: "palette", theme });
          onUpdate({ type: "design", design });
        }
      } else if (update.type === "error") {
        onUpdate({ type: "error", message: update.message });
      } else if (update.type === "done") {
        onUpdate({ type: "done" });
      }
    },
    signal,
    userImages,
  );
}
