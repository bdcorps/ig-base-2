import type { PaletteOption } from "@/lib/schema";
import {
  ImageElementSchema,
  PaletteSchema,
  ShapeElementSchema,
  StackElementSchema,
  TextElementSchema,
} from "@/lib/schema";
import type { z } from "zod";

type SolidBg = { type: "solid"; color: string };
type GradientBg = { type: "gradient"; from: string; to: string; angle: number };
type ImageBg = {
  type: "image";
  imageId: string;
  fit: "cover" | "contain";
  overlay?: string;
  overlayOpacity: number;
};

export type DesignEvent =
  | { type: "slideStart"; data: { index: number; role?: string } }
  | { type: "palette"; data: z.infer<typeof PaletteSchema>; slideIndex: number }
  | {
      type: "background";
      data: SolidBg | GradientBg | ImageBg;
      slideIndex: number;
    }
  | {
      type: "element";
      data:
        | z.infer<typeof TextElementSchema>
        | z.infer<typeof ImageElementSchema>
        | z.infer<typeof ShapeElementSchema>
        | z.infer<typeof StackElementSchema>;
      slideIndex: number;
    }
  | {
      type: "image";
      data: { imageId: string; dataUrl: string; prompt: string };
    }
  | {
      type: "paletteOptions";
      data: {
        palettes: PaletteOption[];
        selectedPaletteId: string | null;
      };
    }
  | { type: "error"; message: string }
  | { type: "done"; slideCount: number };

export interface UserImageInput {
  dataUrl: string;
  name?: string;
}

export interface DesignRequestInput {
  prompt: string;
  userImages: UserImageInput[];
  slideCount?: number;
}

export function parseUserImages(raw: unknown): UserImageInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is UserImageInput =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as UserImageInput).dataUrl === "string" &&
        (item as UserImageInput).dataUrl.startsWith("data:image/"),
    )
    .slice(0, 8);
}

export function parseSlideCount(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const n = Math.round(raw);
  if (n < 1 || n > 12) return undefined;
  return n;
}

export function parseDesignRequestBody(body: unknown): DesignRequestInput | null {
  if (typeof body !== "object" || body === null) return null;
  const prompt =
    typeof (body as { prompt?: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt.trim()
      : "";
  if (!prompt) return null;
  return {
    prompt,
    userImages: parseUserImages((body as { userImages?: unknown }).userImages),
    slideCount: parseSlideCount((body as { slideCount?: unknown }).slideCount),
  };
}
