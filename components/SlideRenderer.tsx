"use client";

import { useRef } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  resolveColor,
  resolveFont,
  type SlideDesign,
  type SlideElement,
  type Theme,
} from "@/lib/schema";

interface Props {
  design: SlideDesign;
  theme: Theme;
  /** Rendered width in px; the 1080x1350 canvas is scaled to fit. */
  displayWidth?: number;
  /** Enable drag-to-move / resize / selection editing. */
  editable?: boolean;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  onElementChange?: (index: number, patch: Partial<SlideElement>) => void;
}

export default function SlideRenderer({
  design,
  theme,
  displayWidth = 400,
  editable = false,
  selectedIndex = null,
  onSelect,
  onElementChange,
}: Props) {
  const scale = displayWidth / CANVAS_WIDTH;
  const displayHeight = CANVAS_HEIGHT * scale;

  return (
    <div
      style={{
        width: displayWidth,
        height: displayHeight,
        position: "relative",
        overflow: "hidden",
        borderRadius: 12 * scale,
        boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
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
          ...backgroundStyle(design, theme),
        }}
      >
        {renderBackgroundImage(design, theme)}
        {design.elements.map((el, i) => (
          <ElementView
            key={i}
            element={el}
            index={i}
            design={design}
            theme={theme}
            scale={scale}
            editable={editable}
            selected={selectedIndex === i}
            onSelect={onSelect}
            onChange={onElementChange}
          />
        ))}
      </div>
    </div>
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

type DragState = {
  mode: "move" | "resize";
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
};

function ElementView({
  element,
  index,
  design,
  theme,
  scale,
  editable,
  selected,
  onSelect,
  onChange,
}: {
  element: SlideElement;
  index: number;
  design: SlideDesign;
  theme: Theme;
  scale: number;
  editable: boolean;
  selected: boolean;
  onSelect?: (index: number | null) => void;
  onChange?: (index: number, patch: Partial<SlideElement>) => void;
}) {
  const drag = useRef<DragState | null>(null);
  const hasHeight = element.kind !== "text";

  const beginDrag = (mode: DragState["mode"], e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(index);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      ox: element.x,
      oy: element.y,
      ow: element.width,
      oh: hasHeight ? (element as { height: number }).height : 0,
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") {
      onChange?.(index, {
        x: Math.round(d.ox + dx),
        y: Math.round(d.oy + dy),
      } as Partial<SlideElement>);
    } else {
      const patch: Record<string, number> = { width: Math.max(60, Math.round(d.ow + dx)) };
      if (hasHeight) patch.height = Math.max(40, Math.round(d.oh + dy));
      onChange?.(index, patch as Partial<SlideElement>);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const base: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: "top left",
    cursor: editable ? "move" : "default",
    outline: selected ? "5px solid rgba(80,150,250,0.95)" : undefined,
    outlineOffset: "3px",
    touchAction: editable ? "none" : undefined,
    userSelect: editable ? "none" : undefined,
  };

  const interaction = editable
    ? {
        onPointerDown: (e: React.PointerEvent) => beginDrag("move", e),
        onPointerMove: onMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
      }
    : {};

  const resizeHandle =
    editable && selected ? (
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

  if (element.kind === "text") {
    return (
      <div
        {...interaction}
        style={{
          ...base,
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
          display: element.background ? "inline-block" : "block",
          whiteSpace: "pre-wrap",
        }}
      >
        {element.segments && element.segments.length > 0
          ? element.segments.map((seg, i) => (
              <span key={i} style={{ color: resolveColor(seg.color, theme.palette) }}>
                {seg.text}
              </span>
            ))
          : element.content}
        {resizeHandle}
      </div>
    );
  }

  if (element.kind === "image") {
    const src = design.images[element.imageId]?.dataUrl;
    return (
      <div
        {...interaction}
        style={{ ...base, height: element.height, borderRadius: element.borderRadius, overflow: "hidden" }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: element.fit, pointerEvents: "none" }}
          />
        ) : (
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
        )}
        {resizeHandle}
      </div>
    );
  }

  // shape
  const radius =
    element.variant === "circle"
      ? "50%"
      : element.variant === "pill"
        ? element.height / 2
        : element.borderRadius;
  return (
    <div
      {...interaction}
      style={{
        ...base,
        height: element.height,
        background: resolveColor(element.color, theme.palette),
        borderRadius: radius,
      }}
    >
      {resizeHandle}
    </div>
  );
}
