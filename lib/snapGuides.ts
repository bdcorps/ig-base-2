import { CANVAS_HEIGHT, CANVAS_WIDTH, type SlideElement } from "@/lib/schema";

export const SNAP_THRESHOLD = 8;

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuides {
  vertical: number[];
  horizontal: number[];
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuides;
}

function estimateElementHeight(el: SlideElement): number {
  if (el.kind === "text") {
    const lines = Math.max(1, Math.ceil((el.content.length * el.fontSize * 0.5) / el.width));
    return Math.round(lines * el.fontSize * el.lineHeight + el.paddingY * 2);
  }
  if (el.kind === "stack") {
    return el.height ?? 240;
  }
  return el.height;
}

export function getElementBounds(el: SlideElement): ElementBounds {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: estimateElementHeight(el),
  };
}

type SnapLine = { value: number; kind: "canvas" | "element" };

function collectVerticalLines(
  elements: SlideElement[],
  excludeIndex: number,
): SnapLine[] {
  const lines: SnapLine[] = [
    { value: 0, kind: "canvas" },
    { value: CANVAS_WIDTH / 2, kind: "canvas" },
    { value: CANVAS_WIDTH, kind: "canvas" },
  ];

  elements.forEach((el, i) => {
    if (i === excludeIndex) return;
    const b = getElementBounds(el);
    lines.push(
      { value: b.x, kind: "element" },
      { value: b.x + b.width / 2, kind: "element" },
      { value: b.x + b.width, kind: "element" },
    );
  });

  return lines;
}

function collectHorizontalLines(
  elements: SlideElement[],
  excludeIndex: number,
): SnapLine[] {
  const lines: SnapLine[] = [
    { value: 0, kind: "canvas" },
    { value: CANVAS_HEIGHT / 2, kind: "canvas" },
    { value: CANVAS_HEIGHT, kind: "canvas" },
  ];

  elements.forEach((el, i) => {
    if (i === excludeIndex) return;
    const b = getElementBounds(el);
    lines.push(
      { value: b.y, kind: "element" },
      { value: b.y + b.height / 2, kind: "element" },
      { value: b.y + b.height, kind: "element" },
    );
  });

  return lines;
}

function snapAxis(
  start: number,
  size: number,
  lines: SnapLine[],
): { position: number; guides: number[] } {
  const edges = [
    { offset: 0, getGuide: (line: number) => line },
    { offset: size / 2, getGuide: (line: number) => line },
    { offset: size, getGuide: (line: number) => line },
  ];

  let bestDist = SNAP_THRESHOLD + 1;
  let bestPos = start;
  let bestGuides: number[] = [];

  for (const line of lines) {
    for (const edge of edges) {
      const pos = line.value - edge.offset;
      const dist = Math.abs(start - pos);
      if (dist <= SNAP_THRESHOLD && dist < bestDist) {
        bestDist = dist;
        bestPos = pos;
        bestGuides = [edge.getGuide(line.value)];
      } else if (dist <= SNAP_THRESHOLD && Math.abs(dist - bestDist) < 0.5) {
        bestGuides.push(edge.getGuide(line.value));
      }
    }
  }

  return { position: bestPos, guides: bestGuides };
}

export function snapPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  excludeIndex: number,
  elements: SlideElement[],
): SnapResult {
  const vLines = collectVerticalLines(elements, excludeIndex);
  const hLines = collectHorizontalLines(elements, excludeIndex);

  const snappedX = snapAxis(x, width, vLines);
  const snappedY = snapAxis(y, height, hLines);

  return {
    x: Math.round(snappedX.position),
    y: Math.round(snappedY.position),
    guides: {
      vertical: snappedX.guides,
      horizontal: snappedY.guides,
    },
  };
}
