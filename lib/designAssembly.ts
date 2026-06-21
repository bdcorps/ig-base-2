import type { DesignEvent } from "@/lib/designEvents";
import type { PaletteOption } from "@/lib/schema";
import {
  applyDesignEvent,
  emptySlideState,
  filterEmptySlides,
  type SlideState,
} from "@/lib/slideState";

export interface AssembledDesign {
  slides: SlideState[];
  paletteOptions: PaletteOption[];
  activePaletteId: string | null;
  slideCount: number;
}

export function assembleDesignFromEvents(events: DesignEvent[]): AssembledDesign {
  let slides: SlideState[] = [];
  let paletteOptions: PaletteOption[] = [];
  let activePaletteId: string | null = null;
  let slideCount = 0;

  for (const event of events) {
    if (event.type === "slideStart") {
      slides = applyDesignEvent(slides, {
        type: "slideStart",
        data: event.data,
      });
    } else if (
      event.type === "palette" ||
      event.type === "background" ||
      event.type === "element"
    ) {
      slides = applyDesignEvent(slides, {
        type: event.type,
        slideIndex: event.slideIndex,
        data: event.data,
      });
    } else if (event.type === "image") {
      slides = applyDesignEvent(slides, {
        type: "image",
        data: event.data,
      });
    } else if (event.type === "paletteOptions") {
      paletteOptions = event.data.palettes;
      activePaletteId = event.data.selectedPaletteId;
    } else if (event.type === "done") {
      slideCount = event.slideCount;
      if (slides.length === 0) {
        slides = [emptySlideState()];
      }
    }
  }

  const nonEmptySlides = filterEmptySlides(slides);

  return {
    slides: nonEmptySlides.length > 0 ? nonEmptySlides : slides,
    paletteOptions,
    activePaletteId,
    slideCount: nonEmptySlides.length || slideCount || slides.length,
  };
}
