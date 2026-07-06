import type { BrandKit } from "@/lib/brandKit";
import { CANVAS_HEIGHT, CANVAS_WIDTH, type ImageElement } from "@/lib/schema";

/** Stable image id the author headshot is registered under for every design. */
export const AUTHOR_IMAGE_ID = "author";

export interface AuthorPhoto {
  imageId: string;
  url: string;
  prompt: string;
}

export function loadAuthorPhoto(brandKit?: BrandKit): AuthorPhoto | null {
  const photo = brandKit?.authorPhotos?.[0];
  if (!photo?.url) return null;
  return { imageId: AUTHOR_IMAGE_ID, url: photo.url, prompt: "Author headshot" };
}

const AUTHOR_WIDTH = 480;
const AUTHOR_HEIGHT = 620;
const AUTHOR_RIGHT_MARGIN = 20;

/**
 * The deterministic intro-slide placement: a transparent headshot cutout
 * anchored flush to the bottom-right corner of the canvas. Matches the safe
 * area the model is told to keep clear on slide 1.
 */
export function buildAuthorImageElement(): ImageElement {
  return {
    kind: "image",
    x: CANVAS_WIDTH - AUTHOR_WIDTH - AUTHOR_RIGHT_MARGIN,
    y: CANVAS_HEIGHT - AUTHOR_HEIGHT,
    width: AUTHOR_WIDTH,
    height: AUTHOR_HEIGHT,
    rotation: 0,
    imageId: AUTHOR_IMAGE_ID,
    fit: "contain",
    borderRadius: 0,
    opacity: 1,
  };
}

/**
 * Brief note appended to the user prompt so the model leaves room for the
 * headshot. References the dynamic author image URL so the model knows exactly
 * which photo is being placed on the intro slide.
 */
export function buildAuthorPromptNote(url: string): string {
  return `\n\nAUTHOR HEADSHOT: The author's headshot photo (image URL: ${url}, registered as imageId "${AUTHOR_IMAGE_ID}") is placed AUTOMATICALLY on the INTRO slide (slide 1), anchored to the BOTTOM-RIGHT corner (it occupies roughly the bottom-right ${AUTHOR_WIDTH}x${AUTHOR_HEIGHT}px area). On slide 1 ONLY: keep that bottom-right corner clear of text and other elements (left-align the hook copy and keep it in the upper/left portion of the slide), and do NOT call generateImage or generateSticker to create another person/headshot for slide 1.`;
}
