import type { DesignEvent } from "@/app/api/design/route";
import type { Background, SlideDesign, SlideElement, Theme } from "@/lib/schema";
import { DEFAULT_THEME } from "@/lib/fonts";

export type DesignStreamUpdate =
  | { type: "palette"; theme: Theme }
  | { type: "design"; design: SlideDesign }
  | { type: "error"; message: string }
  | { type: "done" };

export interface UserImageInput {
  dataUrl: string;
  name?: string;
}

export async function consumeDesignStream(
  prompt: string,
  onUpdate: (update: DesignStreamUpdate) => void,
  signal?: AbortSignal,
  userImages?: UserImageInput[],
): Promise<void> {
  const res = await fetch("/api/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      userImages: userImages?.length ? userImages : undefined,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`);
  }

  let theme: Theme = { ...DEFAULT_THEME };
  let design: SlideDesign = {
    background: { type: "solid", color: "background" },
    elements: [],
    images: {},
  };

  const emitDesign = () => onUpdate({ type: "design", design });

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

      if (event.type === "palette") {
        theme = { ...theme, palette: event.data };
        onUpdate({ type: "palette", theme });
      } else if (event.type === "background") {
        design = {
          ...design,
          background: event.data as Background,
        };
        emitDesign();
      } else if (event.type === "element") {
        design = {
          ...design,
          elements: [...design.elements, event.data as SlideElement],
        };
        emitDesign();
      } else if (event.type === "image") {
        const { imageId, dataUrl, prompt: imgPrompt } = event.data;
        design = {
          ...design,
          images: {
            ...design.images,
            [imageId]: { dataUrl, prompt: imgPrompt },
          },
        };
        emitDesign();
      } else if (event.type === "error") {
        onUpdate({ type: "error", message: event.message });
        return;
      } else if (event.type === "done") {
        onUpdate({ type: "done" });
        return;
      }
    }
  }

  onUpdate({ type: "done" });
}
