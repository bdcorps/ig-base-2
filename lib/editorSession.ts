import type { SlideDesign, Theme } from "@/lib/schema";

const STORAGE_KEY = "carousel-editor-session";

export interface EditorSession {
  prompt: string;
  design: SlideDesign;
  theme: Theme;
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
