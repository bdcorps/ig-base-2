import type { DesignEvent, UserImageInput } from "@/lib/designEvents";
import {
  assembleDesignFromEvents,
  type AssembledDesign,
} from "@/lib/designAssembly";
import { runDesignGeneration } from "@/lib/runDesignGeneration";

export type { AssembledDesign } from "@/lib/designAssembly";

export interface AssembleDesignOptions {
  prompt: string;
  userImages?: UserImageInput[];
  slideCount?: number;
  onProgress?: (event: DesignEvent) => void;
}

export async function assembleDesign(
  opts: AssembleDesignOptions,
): Promise<AssembledDesign> {
  const events: DesignEvent[] = [];

  await runDesignGeneration({
    prompt: opts.prompt,
    userImages: opts.userImages,
    slideCount: opts.slideCount,
    onEvent: (event) => {
      opts.onProgress?.(event);
      events.push(event);
      if (event.type === "error") {
        throw new Error(event.message);
      }
    },
  });

  return assembleDesignFromEvents(events);
}
