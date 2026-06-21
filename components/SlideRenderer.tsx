"use client";

import {
  getElementBounds,
  snapPosition,
  type SnapGuides,
} from "@/lib/snapGuides";
import { useRef, useState } from "react";
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
  /** Called once when a drag/resize gesture begins (for undo history). */
  onEditBegin?: () => void;
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
  onEditBegin,
}: Props) {
  const scale = displayWidth / CANVAS_WIDTH;
  const displayHeight = CANVAS_HEIGHT * scale;
  const [snapGuides, setSnapGuides] = useState<SnapGuides | null>(null);

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
            onSelect={onSelect}
            onEnterStackEdit={onEnterStackEdit}
            onChange={onElementChange}
            onStackChildChange={onStackChildChange}
            onEditBegin={onEditBegin}
            onSnapGuidesChange={setSnapGuides}
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
  const src = design.images[bg.imageId]?.dataUrl;
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

type DragState = {
  mode: "move" | "resize";
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
};

function selectableCursor(editable: boolean, hovered: boolean, dragging: boolean): React.CSSProperties["cursor"] {
  if (!editable) return "default";
  if (dragging) return "grabbing";
  if (hovered) return "pointer";
  return "default";
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
  onSelect,
  onEnterStackEdit,
  onChange,
  onStackChildChange,
  onEditBegin,
  onSnapGuidesChange,
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
  onSelect?: (selection: ElementSelection | null) => void;
  onEnterStackEdit?: (elementIndex: number) => void;
  onChange?: (index: number, patch: Partial<SlideElement>) => void;
  onStackChildChange?: (stackIndex: number, childIndex: number, patch: Partial<StackChild>) => void;
  onEditBegin?: () => void;
  onSnapGuidesChange?: (guides: SnapGuides | null) => void;
}) {
  const drag = useRef<DragState | null>(null);
  const pendingDrag = useRef<{ sx: number; sy: number } | null>(null);
  const editBeginCalled = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const bounds = getElementBounds(element);
  const hasHeight = element.kind === "image" || element.kind === "shape" || (element.kind === "stack" && element.height != null);
  const isStack = element.kind === "stack";

  const markEditBegin = () => {
    if (editBeginCalled.current) return;
    editBeginCalled.current = true;
    onEditBegin?.();
  };

  const startDrag = (mode: DragState["mode"], e: React.PointerEvent) => {
    markEditBegin();
    setDragging(true);
    onSelect?.({ elementIndex: index });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      ox: element.x,
      oy: element.y,
      ow: element.width,
      oh: bounds.height,
    };
  };

  const beginDrag = (mode: DragState["mode"], e: React.PointerEvent) => {
    if (!editable || stackEditing) return;
    e.stopPropagation();
    if (isStack && mode === "move") {
      pendingDrag.current = { sx: e.clientX, sy: e.clientY };
      return;
    }
    e.preventDefault();
    startDrag(mode, e);
  };

  const onPointerDown = (e: React.PointerEvent) => beginDrag("move", e);

  const onPointerMoveWithPending = (e: React.PointerEvent) => {
    if (isStack && pendingDrag.current && !drag.current) {
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
    pendingDrag.current = null;
    endDrag(e);
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
    } else {
      onSnapGuidesChange?.(null);
      const patch: Record<string, number> = { width: Math.max(60, Math.round(d.ow + dx)) };
      if (hasHeight) patch.height = Math.max(40, Math.round(d.oh + dy));
      onChange?.(index, patch as Partial<SlideElement>);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    editBeginCalled.current = false;
    setDragging(false);
    onSnapGuidesChange?.(null);
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
    outline: selected
      ? stackEditing
        ? "3px dashed rgba(80,150,250,0.7)"
        : "5px solid rgba(80,150,250,0.95)"
      : undefined,
    outlineOffset: "3px",
    touchAction: editable ? "none" : undefined,
    userSelect: editable ? "none" : undefined,
  };

  const interaction =
    editable && !stackEditing
      ? {
          ...hoverHandlers,
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
          }
        : {};

  const resizeHandle =
    editable && selected && !stackEditing ? (
      <div
        onPointerDown={(e) => beginDrag("resize", e)}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: "absolute",
          right: -16,
          bottom: -16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(80,150,250,0.95)",
          border: "4px solid white",
          cursor: "nwse-resize",
        }}
      />
    ) : null;

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
        <TextContent element={element} theme={theme} />
        {!pill && resizeHandle}
      </div>
    );
  }

  if (element.kind === "image") {
    return (
      <div
        {...interaction}
        style={{ ...base, height: element.height, borderRadius: element.borderRadius, overflow: "hidden" }}
      >
        <ImageContent element={element} design={design} />
        {resizeHandle}
      </div>
    );
  }

  return (
    <div {...interaction} style={{ ...base, height: element.height, ...shapeStyle(element, theme) }}>
      {resizeHandle}
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
  const drag = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);
  const editBeginCalled = useRef(false);
  const [hovered, setHovered] = useState(false);
  const hasHeight = child.kind !== "text";

  const wrapperStyle: React.CSSProperties = {
    width: pill ? "fit-content" : stretch ? "100%" : child.width,
    maxWidth: "100%",
    flexShrink: 0,
    position: "relative",
    outline: selected ? "4px solid rgba(80,150,250,0.95)" : undefined,
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
          onSelect();
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
          drag.current = {
            sx: e.clientX,
            sy: e.clientY,
            ow: child.width,
            oh: hasHeight ? (child as { height: number }).height : 0,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !onChange) return;
          const dx = (e.clientX - d.sx) / scale;
          const dy = (e.clientY - d.sy) / scale;
          const patch: Partial<StackChild> = { width: Math.max(60, Math.round(d.ow + dx)) };
          if (hasHeight) (patch as { height: number }).height = Math.max(40, Math.round(d.oh + dy));
          onChange(patch);
        }}
        onPointerUp={(e) => {
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
          drag.current = null;
          editBeginCalled.current = false;
        }}
        onPointerCancel={(e) => {
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
          drag.current = null;
          editBeginCalled.current = false;
        }}
        style={{
          position: "absolute",
          right: -12,
          bottom: -12,
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
        <TextContent element={child} theme={theme} />
        {resizeHandle}
      </div>
    );
  }

  if (child.kind === "image") {
    return (
      <div
        {...interaction}
        style={{ ...wrapperStyle, height: child.height, borderRadius: child.borderRadius, overflow: "hidden" }}
      >
        <ImageContent element={child} design={design} />
        {resizeHandle}
      </div>
    );
  }

  return (
    <div {...interaction} style={{ ...wrapperStyle, height: child.height, ...shapeStyle(child, theme) }}>
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

function TextContent({ element, theme }: { element: TextElementLike; theme: Theme }) {
  const pill = isTextPill(element);
  return (
    <div
      style={{
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
      }}
    >
      {element.segments && element.segments.length > 0
        ? element.segments.map((seg, i) => (
            <span key={i} style={{ color: resolveColor(seg.color, theme.palette) }}>
              {seg.text}
            </span>
          ))
        : element.content}
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
  const src = design.images[element.imageId]?.dataUrl;
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

function shapeStyle(
  element: Extract<SlideElement | StackChild, { kind: "shape" }>,
  theme: Theme,
): React.CSSProperties {
  const radius =
    element.variant === "circle"
      ? "50%"
      : element.variant === "pill"
        ? element.height / 2
        : element.borderRadius;
  return {
    background: resolveColor(element.color, theme.palette),
    borderRadius: radius,
  };
}
