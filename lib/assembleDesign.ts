import type { DesignEvent, UserImageInput } from "@/lib/designEvents";
import { runDesignGeneration } from "@/lib/runDesignGeneration";
import type { PaletteOption } from "@/lib/schema";
import {
  applyDesignEvent,
  emptySlideState,
  type SlideState,
} from "@/lib/slideState";

export interface AssembledDesign {
  slides: SlideState[];
  paletteOptions: PaletteOption[];
  activePaletteId: string | null;
  slideCount: number;
}

export interface AssembleDesignOptions {
  prompt: string;
  userImages?: UserImageInput[];
  slideCount?: number;
  onProgress?: (event: DesignEvent) => void;
}

export async function assembleDesign(
  opts: AssembleDesignOptions,
): Promise<AssembledDesign> {
  let slides: SlideState[] = [];
  let paletteOptions: PaletteOption[] = [];
  let activePaletteId: string | null = null;
  let slideCount = 0;

  await runDesignGeneration({
    prompt: opts.prompt,
    userImages: opts.userImages,
    slideCount: opts.slideCount,
    onEvent: (event) => {
      opts.onProgress?.(event);

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
      } else if (event.type === "error") {
        throw new Error(event.message);
      } else if (event.type === "done") {
        slideCount = event.slideCount;
        if (slides.length === 0) {
          slides = [emptySlideState()];
        }
      }
    },
  });

  return {
    slides,
    paletteOptions,
    activePaletteId,
    slideCount: slideCount || slides.length,
  };
}
