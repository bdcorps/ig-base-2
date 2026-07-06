"use client";

import {
  getElementBounds,
  snapPosition,
  type SnapGuides,
} from "@/lib/snapGuides";
import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  resolveColor,
  resolveFont,
  type SlideDesign,
  type SlideElement,
  type StackChild,
  type StackElement,
  type Theme,
} from "@/lib/schema";
import { normalizeTextNewlines } from "@/lib/textContent";
import {
  findShapeIndexAt,
  shapeBorderRadius,
  shapeClipPath,
} from "@/lib/shapes";

interface Props {
  design: SlideDesign;
  theme: Theme;
  /** Rendered width in px; the 1080x1350 canvas is scaled to fit. */
  displayWidth?: number;
  /** Strip chrome (radius) for PNG export. */
  forExport?: boolean;
  /** Enable drag-to-move / resize / selection editing. */
  editable?: boolean;
  selection?: ElementSelection | null;
  /** Stack index when the user has double-clicked into a stack to edit children. */
  stackEditIndex?: number | null;
  onSelect?: (selection: ElementSelection | null) => void;
  onEnterStackEdit?: (elementIndex: number) => void;
  onElementChange?: (index: number, patch: Partial<SlideElement>) => void;
  onStackChildChange?: (stackIndex: number, childIndex: number, patch: Partial<StackChild>) => void;
  onElementContextMenu?: (
    selection: ElementSelection,
    position: { x: number; y: number },
  ) => void;
  /** Called once when a drag/resize gesture begins (for undo history). */
  onEditBegin?: () => void;
  /**
   * Called when an image element is dragged and released with its center over a
   * shape, so the parent can mask the image into that shape.
   */
  onImageDropOnShape?: (imageIndex: number, shapeIndex: number) => void;
}

export type ElementSelection = {
  elementIndex: number;
  childIndex?: number;
};

export default function SlideRenderer({
  design,
  theme,
  displayWidth = 400,
  forExport = false,
  editable = false,
  selection = null,
  stackEditIndex = null,
  onSelect,
  onEnterStackEdit,
  onElementChange,
  onStackChildChange,
  onElementContextMenu,
  onEditBegin,
  onImageDropOnShape,
}: Props) {
  const scale = displayWidth / CANVAS_WIDTH;
  const displayHeight = CANVAS_HEIGHT * scale;
  const [snapGuides, setSnapGuides] = useState<SnapGuides | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  return (
    <div
      data-slide-export=""
      style={{
        width: displayWidth,
        height: displayHeight,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        ...(forExport ? {} : { borderRadius: 12 * scale }),
      }}
    >
      <div
        onPointerDown={editable ? () => onSelect?.(null) : undefined}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          cursor: "default",
          ...backgroundStyle(design, theme),
        }}
      >
        {renderBackgroundImage(design, theme)}
        {editable && snapGuides ? <SnapGuideOverlay guides={snapGuides} /> : null}
        {design.elements.map((el, i) => (
          <ElementView
            key={i}
            element={el}
            index={i}
            design={design}
            theme={theme}
            scale={scale}
            editable={editable}
            selected={selection?.elementIndex === i && selection.childIndex == null}
            selectedChildIndex={
              selection?.elementIndex === i ? (selection.childIndex ?? null) : null
            }
            stackEditing={stackEditIndex === i}
            isDropTarget={dropTargetIndex === i}
            onSelect={onSelect}
            onEnterStackEdit={onEnterStackEdit}
            onChange={onElementChange}
            onStackChildChange={onStackChildChange}
            onElementContextMenu={onElementContextMenu}
            onEditBegin={onEditBegin}
            onSnapGuidesChange={setSnapGuides}
            onDragOverShape={onImageDropOnShape ? setDropTargetIndex : undefined}
            onImageDropOnShape={onImageDropOnShape}
          />
        ))}
      </div>
    </div>
  );
}

function SnapGuideOverlay({ guides }: { guides: SnapGuides }) {
  return (
    <>
      {guides.vertical.map((x, i) => (
        <div
          key={`v-${i}-${x}`}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            width: 1,
            height: CANVAS_HEIGHT,
            background: "#ff2d9b",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        />
      ))}
      {guides.horizontal.map((y, i) => (
        <div
          key={`h-${i}-${y}`}
          style={{
            position: "absolute",
            top: y,
            left: 0,
            height: 1,
            width: CANVAS_WIDTH,
            background: "#ff2d9b",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        />
      ))}
    </>
  );
}

function backgroundStyle(design: SlideDesign, theme: Theme): React.CSSProperties {
  const bg = design.background;
  if (bg.type === "solid") {
    return { background: resolveColor(bg.color, theme.palette) };
  }
  if (bg.type === "gradient") {
    const from = resolveColor(bg.from, theme.palette);
    const to = resolveColor(bg.to, theme.palette);
    return { background: `linear-gradient(${bg.angle ?? 180}deg, ${from}, ${to})` };
  }
  return { background: theme.palette.background };
}

function renderBackgroundImage(design: SlideDesign, theme: Theme) {
  const bg = design.background;
  if (bg.type !== "image") return null;
  const src = design.images[bg.imageId]?.url;
  if (!src) return null;
  const overlay = resolveColor(bg.overlay, theme.palette);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: bg.fit }}
      />
      {overlay && bg.overlayOpacity ? (
        <div style={{ position: "absolute", inset: 0, background: overlay, opacity: bg.overlayOpacity }} />
      ) : null}
    </>
  );
}

function mapAlignItems(value: StackElement["alignItems"]): React.CSSProperties["alignItems"] {
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  return value;
}

function mapJustifyContent(value: StackElement["justifyContent"]): React.CSSProperties["justifyContent"] {
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  return value;
}

type Corner = "nw" | "ne" | "sw" | "se";

type DragState = {
  mode: "move" | "resize";
  /** Which corner is being dragged; the opposite corner stays anchored. */
  corner?: Corner;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
  /** When true, ox/oy/ow/oh track the visible contained image, not the element box. */
  containResize?: boolean;
  aspectRatio?: number;
};

function cornerCursor(corner: Corner): React.CSSProperties["cursor"] {
  return corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
}

type StackChildDragState = {
  sx: number;
  sy: number;
  ow: number;
  oh: number;
  containResize?: boolean;
  aspectRatio?: number;
};

function selectableCursor(editable: boolean, hovered: boolean, dragging: boolean): React.CSSProperties["cursor"] {
  if (!editable) return "default";
  if (dragging) return "grabbing";
  if (hovered) return "pointer";
  return "default";
}

/** Load an image (typically a data URL) and report its intrinsic dimensions. */
function useImageNaturalSize(src: string | undefined): { w: number; h: number } | null {
  const [loaded, setLoaded] = useState<{ src: string; size: { w: number; h: number } } | null>(
    null,
  );
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) {
        setLoaded({ src, size: { w: img.naturalWidth, h: img.naturalHeight } });
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  if (!src) return null;
  return loaded?.src === src ? loaded.size : null;
}

/** The rect actually painted by `object-fit: contain` inside a box. */
function containedImageRect(
  boxW: number,
  boxH: number,
  natW: number,
  natH: number,
): { left: number; top: number; width: number; height: number } {
  if (natW <= 0 || natH <= 0) return { left: 0, top: 0, width: boxW, height: boxH };
  const boxRatio = boxW / boxH;
  const imgRatio = natW / natH;
  if (imgRatio > boxRatio) {
    const height = boxW / imgRatio;
    return { left: 0, top: (boxH - height) / 2, width: boxW, height };
  }
  const width = boxH * imgRatio;
  return { left: (boxW - width) / 2, top: 0, width, height: boxH };
}

function ResizeHandleDot({
  posStyle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  posStyle: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(80,150,250,0.95)",
        border: "4px solid white",
        cursor: "nwse-resize",
        zIndex: 1,
        ...posStyle,
      }}
    />
  );
}

function ElementView({
  element,
  index,
  design,
  theme,
  scale,
  editable,
  selected,
  selectedChildIndex,
  stackEditing,
  isDropTarget,
  onSelect,
  onEnterStackEdit,
  onChange,
  onStackChildChange,
  onElementContextMenu,
  onEditBegin,
  onSnapGuidesChange,
  onDragOverShape,
  onImageDropOnShape,
}: {
  element: SlideElement;
  index: number;
  design: SlideDesign;
  theme: Theme;
  scale: number;
  editable: boolean;
  selected: boolean;
  selectedChildIndex: number | null;
  stackEditing: boolean;
  isDropTarget: boolean;
  onSelect?: (selection: ElementSelection | null) => void;
  onEnterStackEdit?: (elementIndex: number) => void;
  onChange?: (index: number, patch: Partial<SlideElement>) => void;
  onStackChildChange?: (stackIndex: number, childIndex: number, patch: Partial<StackChild>) => void;
  onElementContextMenu?: (
    selection: ElementSelection,
    position: { x: number; y: number },
  ) => void;
  onEditBegin?: () => void;
  onSnapGuidesChange?: (guides: SnapGuides | null) => void;
  onDragOverShape?: (shapeIndex: number | null) => void;
  onImageDropOnShape?: (imageIndex: number, shapeIndex: number) => void;
}) {
  const drag = useRef<DragState | null>(null);
  const pendingDrag = useRef<{ sx: number; sy: number } | null>(null);
  const wasSelectedRef = useRef(false);
  const editBeginCalled = useRef(false);
  /** Shape index the dragged image currently hovers over (-1 when none). */
  const hoverShapeRef = useRef(-1);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const bounds = getElementBounds(element);

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);
  const hasHeight = element.kind === "image" || element.kind === "shape" || (element.kind === "stack" && element.height != null);
  const isStack = element.kind === "stack";

  const imageSrc =
    element.kind === "image" ? design.images[element.imageId]?.url : undefined;
  const naturalSize = useImageNaturalSize(imageSrc);
  const containRect =
    element.kind === "image" && element.fit === "contain" && naturalSize
      ? containedImageRect(element.width, element.height, naturalSize.w, naturalSize.h)
      : null;
  // For letterboxed (contain) images, hug the painted photo instead of the box.
  const useImageOverlaySelection = selected && !stackEditing && containRect != null;

  const markEditBegin = () => {
    if (editBeginCalled.current) return;
    editBeginCalled.current = true;
    onEditBegin?.();
  };

  const startDrag = (mode: DragState["mode"], e: React.PointerEvent) => {
    markEditBegin();
    setDragging(true);
    onSelect?.({ elementIndex: index });
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Pointer may already be released; dragging still works via element events.
    }
    drag.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      ox: element.x,
      oy: element.y,
      ow: element.width,
      oh: bounds.height,
      aspectRatio:
        element.kind === "image" && naturalSize
          ? naturalSize.w / naturalSize.h
          : undefined,
    };
  };

  const beginDrag = (mode: DragState["mode"], e: React.PointerEvent) => {
    if (!editable || stackEditing) return;
    e.stopPropagation();
    if (mode === "move") {
      // Defer committing to a drag until the pointer actually moves, so a plain
      // click can resolve to "select" (first click) or "edit" (second click).
      // Capture the pointer immediately so move events keep flowing even if the
      // cursor leaves this element mid-drag.
      e.preventDefault();
      pendingDrag.current = { sx: e.clientX, sy: e.clientY };
      wasSelectedRef.current = selected;
      if (!selected) onSelect?.({ elementIndex: index });
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // Ignore; not all pointer types support capture.
      }
      return;
    }
    e.preventDefault();
    startDrag(mode, e);
  };

  const onPointerDown = (e: React.PointerEvent) => beginDrag("move", e);

  const onContextMenu = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    pendingDrag.current = null;
    drag.current = null;
    setDragging(false);
    onSelect?.({ elementIndex: index });
    onElementContextMenu?.({ elementIndex: index }, { x: e.clientX, y: e.clientY });
  };

  const onPointerMoveWithPending = (e: React.PointerEvent) => {
    if (pendingDrag.current && !drag.current) {
      const dx = e.clientX - pendingDrag.current.sx;
      const dy = e.clientY - pendingDrag.current.sy;
      if (Math.hypot(dx, dy) >= 4) {
        e.preventDefault();
        startDrag("move", e);
      }
    }
    onMove(e);
  };

  const onPointerUpWithPending = (e: React.PointerEvent) => {
    const wasClick = Boolean(pendingDrag.current) && !drag.current;
    const wasImageMove = drag.current?.mode === "move" && element.kind === "image";
    const dropShapeIndex = hoverShapeRef.current;
    pendingDrag.current = null;
    if (wasClick) {
      try {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // Capture may not be held; safe to ignore.
      }
    }
    endDrag(e);
    // Dropped an image with its center over a shape → mask it into the shape.
    if (wasImageMove && dropShapeIndex !== -1) {
      onImageDropOnShape?.(index, dropShapeIndex);
    }
    // A click (no drag) on an already-selected element: text becomes editable,
    // a stack enters child-editing mode.
    if (wasClick && wasSelectedRef.current) {
      if (element.kind === "text") {
        setEditing(true);
      } else if (isStack) {
        onEnterStackEdit?.(index);
      }
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") {
      const rawX = Math.round(d.ox + dx);
      const rawY = Math.round(d.oy + dy);
      const snapped = snapPosition(rawX, rawY, d.ow, d.oh, index, design.elements);
      const hasGuides = snapped.guides.vertical.length > 0 || snapped.guides.horizontal.length > 0;
      onSnapGuidesChange?.(hasGuides ? snapped.guides : null);
      onChange?.(index, {
        x: snapped.x,
        y: snapped.y,
      } as Partial<SlideElement>);
      // While dragging an image, highlight any shape it can be masked into.
      if (element.kind === "image" && onDragOverShape) {
        const cx = snapped.x + d.ow / 2;
        const cy = snapped.y + d.oh / 2;
        const shapeIdx = findShapeIndexAt(design.elements, cx, cy, index);
        if (shapeIdx !== hoverShapeRef.current) {
          hoverShapeRef.current = shapeIdx;
          onDragOverShape(shapeIdx === -1 ? null : shapeIdx);
        }
      }
    } else {
      onSnapGuidesChange?.(null);
      const corner = d.corner ?? "se";
      const right = corner.includes("e");
      const bottom = corner.includes("s");
      // Flip the delta so dragging any corner grows the box outward.
      const signedDx = right ? dx : -dx;
      const signedDy = bottom ? dy : -dy;
      if (d.aspectRatio) {
        const newW = Math.max(60, Math.round(d.ow + signedDx));
        const newH = Math.max(40, Math.round(newW / d.aspectRatio));
        onChange?.(index, {
          x: Math.round(right ? d.ox : d.ox + d.ow - newW),
          y: Math.round(bottom ? d.oy : d.oy + d.oh - newH),
          width: newW,
          height: newH,
        } as Partial<SlideElement>);
      } else {
        const newW = Math.max(60, Math.round(d.ow + signedDx));
        const patch: Record<string, number> = {
          width: newW,
          x: Math.round(right ? d.ox : d.ox + d.ow - newW),
        };
        if (hasHeight) {
          const newH = Math.max(40, Math.round(d.oh + signedDy));
          patch.height = newH;
          patch.y = Math.round(bottom ? d.oy : d.oy + d.oh - newH);
        }
        onChange?.(index, patch as Partial<SlideElement>);
      }
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    editBeginCalled.current = false;
    setDragging(false);
    onSnapGuidesChange?.(null);
    if (hoverShapeRef.current !== -1) {
      hoverShapeRef.current = -1;
      onDragOverShape?.(null);
    }
  };

  const hoverHandlers = editable
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : {};

  const base: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: "top left",
    cursor: selectableCursor(editable && !stackEditing, hovered, dragging),
    outline: selected && !useImageOverlaySelection
      ? stackEditing
        ? "3px dashed rgba(80,150,250,0.7)"
        : "5px solid rgba(80,150,250,0.95)"
      : hovered && !stackEditing && !useImageOverlaySelection
        ? "3px solid rgba(80,150,250,0.45)"
        : undefined,
    outlineOffset: "3px",
    touchAction: editable ? "none" : undefined,
    userSelect: editable ? "none" : undefined,
  };

  const interaction =
    editable && !stackEditing
      ? {
          ...hoverHandlers,
          onContextMenu,
          onPointerDown,
          onPointerMove: onPointerMoveWithPending,
          onPointerUp: onPointerUpWithPending,
          onPointerCancel: onPointerUpWithPending,
        }
      : editable && stackEditing
        ? {
            ...hoverHandlers,
            onPointerDown: (e: React.PointerEvent) => {
              e.stopPropagation();
              onSelect?.({ elementIndex: index });
            },
            onContextMenu,
          }
        : {};

  const showResizeHandle = editable && selected && !stackEditing;

  const startResize = (corner: Corner, contain: boolean) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!editable || stackEditing) return;
    if (contain && (!containRect || !naturalSize)) return;
    e.preventDefault();
    markEditBegin();
    setDragging(true);
    onSelect?.({ elementIndex: index });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current =
      contain && containRect && naturalSize
        ? {
            mode: "resize",
            corner,
            sx: e.clientX,
            sy: e.clientY,
            ox: element.x + containRect.left,
            oy: element.y + containRect.top,
            ow: containRect.width,
            oh: containRect.height,
            containResize: true,
            aspectRatio: naturalSize.w / naturalSize.h,
          }
        : {
            mode: "resize",
            corner,
            sx: e.clientX,
            sy: e.clientY,
            ox: element.x,
            oy: element.y,
            ow: element.width,
            oh: bounds.height,
            aspectRatio:
              element.kind === "image" && naturalSize
                ? naturalSize.w / naturalSize.h
                : undefined,
          };
  };

  const renderCornerHandles = (contain: boolean, rect?: { left: number; top: number; width: number; height: number }) => {
    const positions: Record<Corner, React.CSSProperties> = rect
      ? {
          nw: { left: rect.left - 16, top: rect.top - 16 },
          ne: { left: rect.left + rect.width - 16, top: rect.top - 16 },
          sw: { left: rect.left - 16, top: rect.top + rect.height - 16 },
          se: { left: rect.left + rect.width - 16, top: rect.top + rect.height - 16 },
        }
      : {
          nw: { left: -16, top: -16 },
          ne: { right: -16, top: -16 },
          sw: { left: -16, bottom: -16 },
          se: { right: -16, bottom: -16 },
        };
    return (Object.keys(positions) as Corner[]).map((corner) => (
      <ResizeHandleDot
        key={corner}
        posStyle={{ ...positions[corner], cursor: cornerCursor(corner) }}
        onPointerDown={startResize(corner, contain)}
        onPointerMove={onMove}
        onPointerUp={endDrag}
      />
    ));
  };

  const resizeHandle = showResizeHandle ? <>{renderCornerHandles(false)}</> : null;

  if (element.kind === "stack") {
    return (
      <div
        {...interaction}
        onDoubleClick={
          editable
            ? (e) => {
                e.stopPropagation();
                pendingDrag.current = null;
                drag.current = null;
                setDragging(false);
                onEnterStackEdit?.(index);
              }
            : undefined
        }
        style={{
          ...base,
          display: "flex",
          flexDirection: element.direction === "row" ? "row" : "column",
          gap: element.gap,
          alignItems: mapAlignItems(element.alignItems),
          justifyContent: mapJustifyContent(element.justifyContent),
          paddingLeft: element.paddingX,
          paddingRight: element.paddingX,
          paddingTop: element.paddingY,
          paddingBottom: element.paddingY,
          height: element.height ?? "auto",
          boxSizing: "border-box",
        }}
      >
        {element.children.map((child, ci) => (
          <StackChildView
            key={ci}
            child={child}
            design={design}
            theme={theme}
            stack={element}
            editable={editable && stackEditing}
            selected={selectedChildIndex === ci}
            onSelect={() => onSelect?.({ elementIndex: index, childIndex: ci })}
            onChange={(patch) => onStackChildChange?.(index, ci, patch)}
            onEditBegin={onEditBegin}
            scale={scale}
          />
        ))}
        {resizeHandle}
      </div>
    );
  }

  if (element.kind === "text") {
    const pill = isTextPill(element);
    return (
      <div
        {...interaction}
        style={pill ? { ...base, ...textPillWrapperStyle() } : base}
      >
        <EditableTextContent
          element={element}
          theme={theme}
          editable={editable && !stackEditing}
          editing={editing}
          setEditing={setEditing}
          onContentChange={(content) =>
            onChange?.(index, { content, segments: undefined } as Partial<SlideElement>)
          }
          onEditBegin={markEditBegin}
        />
        {!pill && resizeHandle}
      </div>
    );
  }

  if (element.kind === "image") {
    return (
      <div {...interaction} style={{ ...base, height: element.height }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: element.borderRadius,
            opacity: element.opacity ?? 1,
            overflow: "hidden",
          }}
        >
          <ImageContent element={element} design={design} />
        </div>
        {useImageOverlaySelection && containRect ? (
          <div
            style={{
              position: "absolute",
              left: containRect.left,
              top: containRect.top,
              width: containRect.width,
              height: containRect.height,
              outline: "5px solid rgba(80,150,250,0.95)",
              outlineOffset: "3px",
              borderRadius: element.borderRadius,
              pointerEvents: "none",
            }}
          />
        ) : null}
        {useImageOverlaySelection && containRect ? (
          renderCornerHandles(true, containRect)
        ) : (
          resizeHandle
        )}
      </div>
    );
  }

  return (
    <div
      {...interaction}
      style={{
        ...base,
        height: element.height,
        outline: isDropTarget
          ? "5px solid rgba(80,150,250,0.95)"
          : base.outline,
        outlineOffset: "3px",
      }}
    >
      <ShapeFill element={element} design={design} theme={theme} />
      {resizeHandle}
    </div>
  );
}

/** Renders a shape's fill: a solid color, or an image masked to the shape. */
function ShapeFill({
  element,
  design,
  theme,
}: {
  element: Extract<SlideElement | StackChild, { kind: "shape" }>;
  design: SlideDesign;
  theme: Theme;
}) {
  const clipPath = shapeClipPath(element.variant);
  const radius = shapeBorderRadius(element.variant, element.height, element.borderRadius);
  const src = element.imageId ? design.images[element.imageId]?.url : undefined;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: radius,
        clipPath,
        WebkitClipPath: clipPath,
        background: src ? undefined : resolveColor(element.color, theme.palette),
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.fit ?? "cover",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}

function StackChildView({
  child,
  design,
  theme,
  stack,
  editable,
  selected,
  onSelect,
  onChange,
  onEditBegin,
  scale,
}: {
  child: StackChild;
  design: SlideDesign;
  theme: Theme;
  stack: StackElement;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange?: (patch: Partial<StackChild>) => void;
  onEditBegin?: () => void;
  scale: number;
}) {
  const stretch = stack.alignItems === "stretch";
  const pill = child.kind === "text" && isTextPill(child);
  const drag = useRef<StackChildDragState | null>(null);
  const wasSelectedRef = useRef(false);
  const editBeginCalled = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasHeight = child.kind !== "text";

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const imageSrc = child.kind === "image" ? design.images[child.imageId]?.url : undefined;
  const naturalSize = useImageNaturalSize(imageSrc);
  const containRect =
    child.kind === "image" && child.fit === "contain" && naturalSize
      ? containedImageRect(child.width, child.height, naturalSize.w, naturalSize.h)
      : null;
  const useImageOverlaySelection = selected && child.kind === "image" && containRect != null;

  const wrapperStyle: React.CSSProperties = {
    width: pill ? "fit-content" : stretch ? "100%" : child.width,
    maxWidth: "100%",
    flexShrink: 0,
    position: "relative",
    outline: selected && !useImageOverlaySelection
      ? "4px solid rgba(80,150,250,0.95)"
      : hovered && !useImageOverlaySelection
        ? "2px solid rgba(80,150,250,0.45)"
        : undefined,
    outlineOffset: "2px",
    cursor: editable ? (hovered ? "pointer" : "default") : "default",
    touchAction: editable ? "none" : undefined,
  };

  const hoverHandlers = editable
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : {};

  const interaction = editable
    ? {
        ...hoverHandlers,
        onPointerDown: (e: React.PointerEvent) => {
          e.stopPropagation();
          wasSelectedRef.current = selected;
          if (!selected) onSelect();
        },
        onPointerUp: () => {
          // Second click on an already-selected text child enters edit mode.
          if (wasSelectedRef.current && child.kind === "text") setEditing(true);
        },
        onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
      }
    : {};

  const resizeHandle =
    editable && selected && onChange && !pill ? (
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
          if (!editBeginCalled.current) {
            editBeginCalled.current = true;
            onEditBegin?.();
          }
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          const useContainResize = Boolean(useImageOverlaySelection && containRect && naturalSize);
          drag.current = {
            sx: e.clientX,
            sy: e.clientY,
            ow: useContainResize && containRect ? containRect.width : child.width,
            oh: useContainResize && containRect
              ? containRect.height
              : hasHeight
                ? (child as { height: number }).height
                : 0,
            containResize: useContainResize,
            aspectRatio: naturalSize ? naturalSize.w / naturalSize.h : undefined,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !onChange) return;
          const dx = (e.clientX - d.sx) / scale;
          const dy = (e.clientY - d.sy) / scale;
          if (d.containResize && d.aspectRatio) {
            const newW = Math.max(60, Math.round(d.ow + dx));
            const newH = Math.max(40, Math.round(newW / d.aspectRatio));
            onChange({ width: newW, height: newH } as Partial<StackChild>);
          } else if (child.kind === "image" && d.aspectRatio) {
            const newW = Math.max(60, Math.round(d.ow + dx));
            const newH = Math.max(40, Math.round(newW / d.aspectRatio));
            onChange({ width: newW, height: newH } as Partial<StackChild>);
          } else {
            const patch: Partial<StackChild> = { width: Math.max(60, Math.round(d.ow + dx)) };
            if (hasHeight) (patch as { height: number }).height = Math.max(40, Math.round(d.oh + dy));
            onChange(patch);
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
          drag.current = null;
          editBeginCalled.current = false;
        }}
        onPointerCancel={(e) => {
          e.stopPropagation();
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
          drag.current = null;
          editBeginCalled.current = false;
        }}
        style={{
          position: "absolute",
          ...(useImageOverlaySelection && containRect
            ? {
                left: containRect.left + containRect.width - 12,
                top: containRect.top + containRect.height - 12,
              }
            : { right: -12, bottom: -12 }),
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(80,150,250,0.95)",
          border: "3px solid white",
          cursor: "nwse-resize",
          zIndex: 1,
        }}
      />
    ) : null;

  if (child.kind === "text") {
    return (
      <div {...interaction} style={wrapperStyle}>
        <EditableTextContent
          element={child}
          theme={theme}
          editable={editable}
          editing={editing}
          setEditing={setEditing}
          onContentChange={(content) =>
            onChange?.({ content, segments: undefined } as Partial<StackChild>)
          }
          onEditBegin={() => {
            if (!editBeginCalled.current) {
              editBeginCalled.current = true;
              onEditBegin?.();
            }
          }}
        />
        {resizeHandle}
      </div>
    );
  }

  if (child.kind === "image") {
    return (
      <div {...interaction} style={{ ...wrapperStyle, height: child.height }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: child.borderRadius,
            opacity: child.opacity ?? 1,
            overflow: "hidden",
          }}
        >
          <ImageContent element={child} design={design} />
        </div>
        {useImageOverlaySelection && containRect ? (
          <div
            style={{
              position: "absolute",
              left: containRect.left,
              top: containRect.top,
              width: containRect.width,
              height: containRect.height,
              outline: "4px solid rgba(80,150,250,0.95)",
              outlineOffset: "2px",
              borderRadius: child.borderRadius,
              pointerEvents: "none",
            }}
          />
        ) : null}
        {resizeHandle}
      </div>
    );
  }

  return (
    <div {...interaction} style={{ ...wrapperStyle, height: child.height }}>
      <ShapeFill element={child} design={design} theme={theme} />
      {resizeHandle}
    </div>
  );
}

type TextElementLike = Extract<SlideElement | StackChild, { kind: "text" }>;

function isTextPill(element: Pick<TextElementLike, "kind" | "background">): boolean {
  return element.kind === "text" && Boolean(element.background);
}

function textPillWrapperStyle(): React.CSSProperties {
  return { width: "fit-content", maxWidth: "100%" };
}

function textContentStyle(element: TextElementLike, theme: Theme): React.CSSProperties {
  const pill = isTextPill(element);
  return {
    fontFamily: `'${resolveFont(element.font, theme.fonts)}', sans-serif`,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    color: resolveColor(element.color, theme.palette),
    textAlign: element.align,
    fontStyle: element.italic ? "italic" : "normal",
    textTransform: element.uppercase ? "uppercase" : "none",
    lineHeight: element.lineHeight,
    letterSpacing: element.letterSpacing,
    background: resolveColor(element.background, theme.palette),
    paddingLeft: element.paddingX,
    paddingRight: element.paddingX,
    paddingTop: element.paddingY,
    paddingBottom: element.paddingY,
    borderRadius: element.borderRadius,
    boxSizing: "border-box",
    display: pill ? "inline-block" : "block",
    whiteSpace: pill ? "nowrap" : "pre-wrap",
    width: pill ? "max-content" : "100%",
  };
}

function TextContent({
  element,
  theme,
}: {
  element: TextElementLike;
  theme: Theme;
}) {
  const hasSegments = Boolean(element.segments && element.segments.length > 0);

  return (
    <div style={textContentStyle(element, theme)}>
      {hasSegments
        ? element.segments!.map((seg, i) => (
            <span
              key={i}
              style={{
                color: resolveColor(seg.color, theme.palette),
                fontStyle: seg.italic == null ? undefined : seg.italic ? "italic" : "normal",
              }}
            >
              {normalizeTextNewlines(seg.text)}
            </span>
          ))
        : normalizeTextNewlines(element.content)}
    </div>
  );
}

function EditableTextContent({
  element,
  theme,
  editable,
  editing,
  setEditing,
  onContentChange,
  onEditBegin,
}: {
  element: TextElementLike;
  theme: Theme;
  editable: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  onContentChange: (content: string) => void;
  onEditBegin?: () => void;
}) {
  const editRef = useRef<HTMLDivElement>(null);
  const displayContent = normalizeTextNewlines(element.content);
  const draftRef = useRef(displayContent);

  useEffect(() => {
    if (!editing) draftRef.current = displayContent;
  }, [displayContent, editing]);

  useEffect(() => {
    if (!editing || !editRef.current) return;
    editRef.current.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editRef.current);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  const commit = () => {
    const next = editRef.current?.innerText ?? draftRef.current;
    setEditing(false);
    if (next !== displayContent) {
      onEditBegin?.();
      onContentChange(next);
    }
  };

  const cancel = () => {
    setEditing(false);
    if (editRef.current) editRef.current.innerText = displayContent;
  };

  // Commit and exit edit mode when the user clicks anywhere outside the text.
  // Capture phase runs before the canvas' deselect handler so the latest text
  // is read while the editable node is still mounted.
  useEffect(() => {
    if (!editing) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        commit();
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editable) {
    return <TextContent element={element} theme={theme} />;
  }

  if (editing) {
    return (
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onPointerDown={(e) => e.stopPropagation()}
        onInput={() => {
          draftRef.current = editRef.current?.innerText ?? draftRef.current;
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
            return;
          }
          if (e.key === "Enter" && !e.shiftKey && isTextPill(element)) {
            e.preventDefault();
            commit();
          }
        }}
        style={{
          ...textContentStyle(element, theme),
          outline: "2px solid rgba(80,150,250,0.95)",
          outlineOffset: 2,
          cursor: "text",
          userSelect: "text",
        }}
      >
        {displayContent}
      </div>
    );
  }

  return (
    <div
      style={{ ...textContentStyle(element, theme), cursor: "text" }}
    >
      {element.segments && element.segments.length > 0
        ? element.segments.map((seg, i) => (
            <span
              key={i}
              style={{
                color: resolveColor(seg.color, theme.palette),
                fontStyle: seg.italic == null ? undefined : seg.italic ? "italic" : "normal",
              }}
            >
              {normalizeTextNewlines(seg.text)}
            </span>
          ))
        : displayContent}
    </div>
  );
}

function ImageContent({
  element,
  design,
}: {
  element: Extract<SlideElement | StackChild, { kind: "image" }>;
  design: SlideDesign;
}) {
  const src = design.images[element.imageId]?.url;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: element.fit, pointerEvents: "none" }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(0,0,0,0.4)",
        fontSize: 24,
      }}
    >
      missing image
    </div>
  );
}

