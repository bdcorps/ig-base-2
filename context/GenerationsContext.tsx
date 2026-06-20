"use client";

import { streamDesign } from "@/hooks/useDesignStream";
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
  useState,
  type ReactNode,
} from "react";

interface GenerationsContextValue {
  generations: Generation[];
  updateGeneration: (id: string, patch: Partial<Generation>) => void;
  startGeneration: (prompt: string, slideCount: number) => string;
  importFromEditorSession: () => string | null;
  loadSampleDesign: () => string;
}

const GenerationsContext = createContext<GenerationsContextValue | null>(null);

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);

  const updateGeneration = useCallback((id: string, patch: Partial<Generation>) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }, []);

  const runStream = useCallback(
    async (id: string, prompt: string, slideCount: number) => {
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
        });
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
    (prompt: string, slideCount: number) => {
      const gen = createGeneration(prompt, slideCount);
      setGenerations((prev) => [gen, ...prev]);
      void runStream(gen.id, prompt, slideCount);
      return gen.id;
    },
    [runStream],
  );

  const importFromEditorSession = useCallback(() => {
    const session = loadEditorSession();
    if (!session) return null;

    const gen = createGeneration(session.prompt, 1);
    gen.status = "complete";
    gen.slides = [{ design: session.design, theme: session.theme }];
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
        updateGeneration,
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
  const { generations, updateGeneration } = useGenerations();
  const generation = generations.find((g) => g.id === id) ?? null;
  return { generation, updateGeneration };
}
