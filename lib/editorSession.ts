import type { SlideDesign, Theme } from "@/lib/schema";
import type { SlideState } from "@/lib/slideState";

const STORAGE_KEY = "carousel-editor-session";

export interface EditorSession {
  prompt: string;
  /** Full multi-slide carousel. Preferred over the single design/theme below. */
  slides?: SlideState[];
  /** Legacy single-slide payload (still used when opening one slide in the editor). */
  design?: SlideDesign;
  theme?: Theme;
}

export function saveEditorSession(session: EditorSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadEditorSession(): EditorSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditorSession;
  } catch {
    return null;
  }
}

export function clearEditorSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
