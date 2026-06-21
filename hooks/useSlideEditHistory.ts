"use client";

import type { SlideState } from "@/lib/slideState";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_HISTORY = 60;

export function useSlideEditHistory(
  slides: SlideState[],
  onRestore: (slides: SlideState[]) => void,
  resetKey: string,
) {
  const historyRef = useRef<{ past: SlideState[][]; future: SlideState[][] }>({
    past: [],
    future: [],
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  useEffect(() => {
    historyRef.current = { past: [], future: [] };
    syncFlags();
  }, [resetKey, syncFlags]);

  const pushHistory = useCallback(() => {
    historyRef.current.past.push(structuredClone(slides));
    if (historyRef.current.past.length > MAX_HISTORY) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    syncFlags();
  }, [slides, syncFlags]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    future.push(structuredClone(slides));
    const previous = past.pop()!;
    onRestore(previous);
    syncFlags();
  }, [slides, onRestore, syncFlags]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    past.push(structuredClone(slides));
    const next = future.pop()!;
    onRestore(next);
    syncFlags();
  }, [slides, onRestore, syncFlags]);

  return { pushHistory, undo, redo, canUndo, canRedo };
}
