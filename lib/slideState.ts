import { DEFAULT_THEME } from "@/lib/fonts";
import type { Background, SlideDesign, SlideElement, Theme } from "@/lib/schema";

export interface SlideState {
  design: SlideDesign;
  theme: Theme;
}

export function emptySlideDesign(): SlideDesign {
  return {
    background: { type: "solid", color: "background" },
    elements: [],
    images: {},
  };
}

export function emptySlideState(): SlideState {
  return {
    design: emptySlideDesign(),
    theme: { ...DEFAULT_THEME },
  };
}

export function ensureSlideSlot(
  slides: SlideState[],
  index: number,
): SlideState[] {
  const next = [...slides];
  while (next.length <= index) {
    next.push(emptySlideState());
  }
  return next;
}

export function applyDesignEvent(
  slides: SlideState[],
  event: {
    type: "slideStart" | "palette" | "background" | "element" | "image";
    slideIndex?: number;
    data: unknown;
  },
): SlideState[] {
  if (event.type === "slideStart") {
    const { index } = event.data as { index: number };
    return ensureSlideSlot(slides, index);
  }

  const slideIndex = event.slideIndex ?? 0;
  let next = ensureSlideSlot(slides, slideIndex);
  const slide = next[slideIndex];

  if (event.type === "palette") {
    next[slideIndex] = {
      ...slide,
      theme: { ...slide.theme, palette: event.data as SlideState["theme"]["palette"] },
    };
  } else if (event.type === "background") {
    next[slideIndex] = {
      ...slide,
      design: { ...slide.design, background: event.data as Background },
    };
  } else if (event.type === "element") {
    next[slideIndex] = {
      ...slide,
      design: {
        ...slide.design,
        elements: [...slide.design.elements, event.data as SlideElement],
      },
    };
  } else if (event.type === "image") {
    const { imageId, dataUrl, prompt } = event.data as {
      imageId: string;
      dataUrl: string;
      prompt: string;
    };
    next = next.map((s) => ({
      ...s,
      design: {
        ...s.design,
        images: {
          ...s.design.images,
          [imageId]: { dataUrl, prompt },
        },
      },
    }));
  }

  return next;
}
