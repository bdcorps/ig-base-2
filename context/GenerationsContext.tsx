"use client";

import { streamDesign } from "@/hooks/useDesignStream";
import { trackEvent } from "@/lib/analytics";
import { clearEditorSession, loadEditorSession } from "@/lib/editorSession";
import {
  createGeneration,
  type Generation,
} from "@/lib/generations";
import { createSampleGeneration } from "@/lib/sampleDesign";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface GenerationsContextValue {
  generations: Generation[];
  hydrated: boolean;
  updateGeneration: (id: string, patch: Partial<Generation>) => void;
  deleteGeneration: (id: string) => void;
  startGeneration: (
    prompt: string,
    slideCount: number,
    templateId?: string | null,
  ) => string;
  importFromEditorSession: () => string | null;
  loadSampleDesign: () => string;
}

const GenerationsContext = createContext<GenerationsContextValue | null>(null);

const STORAGE_KEY = "carousel-generations";

function loadStoredGenerations(): Generation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Generation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate completed generations from localStorage so direct navigation /
  // refresh of /design/[id] still finds the design. Merge with anything already
  // created this session (e.g. an in-flight import) without clobbering it.
  useEffect(() => {
    const stored = loadStoredGenerations();
    if (stored.length > 0) {
      setGenerations((prev) => {
        const existing = new Set(prev.map((g) => g.id));
        return [...prev, ...stored.filter((g) => !existing.has(g.id))];
      });
    }
    setHydrated(true);
  }, []);

  // Persist terminal (complete/error) generations, debounced so streaming and
  // canvas edits don't thrash localStorage.
  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      const terminal = generations
        .filter((g) => g.status === "complete" || g.status === "error")
        .slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(terminal));
      } catch {
        // Ignore quota / serialization errors.
      }
    }, 800);
    return () => window.clearTimeout(handle);
  }, [generations, hydrated]);

  const updateGeneration = useCallback((id: string, patch: Partial<Generation>) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }, []);

  const deleteGeneration = useCallback((id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const runStream = useCallback(
    async (
      id: string,
      prompt: string,
      slideCount: number,
      templateId?: string | null,
    ) => {
      try {
        await streamDesign(prompt, slideCount, (patch) => {
          setGenerations((prev) =>
            prev.map((g) => {
              if (g.id !== id) return g;
              const next = { ...g, ...patch };
              if (patch.slides && next.activePaletteId) {
                const selected = next.generatedPalettes.find(
                  (p) => p.id === next.activePaletteId,
                );
                if (selected) {
                  next.slides = next.slides.map((s) => ({
                    ...s,
                    theme: { ...s.theme, palette: selected.palette },
                  }));
                }
              }
              return next;
            }),
          );
        }, templateId);
      } catch (err) {
        updateGeneration(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    [updateGeneration],
  );

  const startGeneration = useCallback(
    (prompt: string, slideCount: number, templateId?: string | null) => {
      const gen = createGeneration(prompt, slideCount);
      trackEvent("create_prompt", {
        generation_id: gen.id,
        slide_count: slideCount,
        prompt_length: prompt.trim().length,
        ...(templateId ? { template_id: templateId } : {}),
      });
      setGenerations((prev) => [gen, ...prev]);
      void runStream(gen.id, prompt, slideCount, templateId);
      return gen.id;
    },
    [runStream],
  );

  const importFromEditorSession = useCallback(() => {
    const session = loadEditorSession();
    if (!session) return null;

    const slides =
      session.slides && session.slides.length > 0
        ? session.slides
        : session.design && session.theme
          ? [{ design: session.design, theme: session.theme }]
          : [];
    if (slides.length === 0) {
      clearEditorSession();
      return null;
    }

    const gen = createGeneration(session.prompt, slides.length);
    gen.status = "complete";
    gen.slides = slides;
    setGenerations((prev) => [gen, ...prev]);
    clearEditorSession();
    return gen.id;
  }, []);

  const loadSampleDesign = useCallback(() => {
    const gen = createSampleGeneration();
    setGenerations((prev) => [gen, ...prev]);
    return gen.id;
  }, []);

  return (
    <GenerationsContext.Provider
      value={{
        generations,
        hydrated,
        updateGeneration,
        deleteGeneration,
        startGeneration,
        importFromEditorSession,
        loadSampleDesign,
      }}
    >
      {children}
    </GenerationsContext.Provider>
  );
}

export function useGenerations() {
  const ctx = useContext(GenerationsContext);
  if (!ctx) throw new Error("useGenerations must be used within GenerationsProvider");
  return ctx;
}

export function useGeneration(id: string | undefined) {
  const { generations, updateGeneration, hydrated } = useGenerations();
  const generation = generations.find((g) => g.id === id) ?? null;
  return { generation, updateGeneration, hydrated };
}
