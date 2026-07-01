import type { SlideElement } from "./schema";

/**
 * Shape variants used by the `shape` element. Basic variants (rect / circle /
 * pill) are rendered with `border-radius`; the rest use a CSS `clip-path` whose
 * percentages are relative to the element box, so a shape (and any image masked
 * into it) adapts to any size and is captured correctly by the PNG export.
 */
export const SHAPE_VARIANTS = [
  { id: "rect", label: "Rectangle", clipPath: undefined },
  { id: "circle", label: "Circle", clipPath: undefined },
  { id: "pill", label: "Pill", clipPath: undefined },
  { id: "triangle", label: "Triangle", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" },
  { id: "diamond", label: "Diamond", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  {
    id: "pentagon",
    label: "Pentagon",
    clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  },
  {
    id: "hexagon",
    label: "Hexagon",
    clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  },
  {
    id: "octagon",
    label: "Octagon",
    clipPath:
      "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  },
  {
    id: "star",
    label: "Star",
    clipPath:
      "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  },
  {
    id: "heart",
    label: "Heart",
    clipPath:
      "polygon(50% 100%, 15% 65%, 0% 38%, 8% 15%, 30% 8%, 50% 25%, 70% 8%, 92% 15%, 100% 38%, 85% 65%)",
  },
] as const;

export type ShapeVariant = (typeof SHAPE_VARIANTS)[number]["id"];

/** Tuple of variant ids for building a zod enum. */
export const SHAPE_VARIANT_IDS = SHAPE_VARIANTS.map((v) => v.id) as [
  ShapeVariant,
  ...ShapeVariant[],
];

const CLIP_PATH_BY_VARIANT = Object.fromEntries(
  SHAPE_VARIANTS.map((v) => [v.id, v.clipPath]),
) as Record<ShapeVariant, string | undefined>;

/** CSS `clip-path` for a variant (undefined for the border-radius variants). */
export function shapeClipPath(variant: ShapeVariant): string | undefined {
  return CLIP_PATH_BY_VARIANT[variant];
}

/** Border radius (px or "50%") for the non-clip-path variants. */
export function shapeBorderRadius(
  variant: ShapeVariant,
  height: number,
  borderRadius: number,
): number | string {
  if (variant === "circle") return "50%";
  if (variant === "pill") return height / 2;
  if (variant === "rect") return borderRadius;
  return 0;
}

/**
 * Topmost shape (highest z-index) whose box contains the point (cx, cy) and
 * that isn't already holding an image. Returns -1 when none match. Used both to
 * highlight the drop target while dragging and to commit the mask on drop.
 */
export function findShapeIndexAt(
  elements: SlideElement[],
  cx: number,
  cy: number,
  excludeIndex: number,
): number {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (i === excludeIndex) continue;
    const el = elements[i];
    if (el.kind !== "shape" || el.imageId) continue;
    if (cx >= el.x && cx <= el.x + el.width && cy >= el.y && cy <= el.y + el.height) {
      return i;
    }
  }
  return -1;
}
