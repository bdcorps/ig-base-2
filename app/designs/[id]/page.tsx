import PersistedDesignView from "@/components/PersistedDesignView";
import type { AssembledDesign } from "@/lib/designAssembly";
import { prisma } from "@/lib/prisma";
import type { SlideState } from "@/lib/slideState";
import { notFound } from "next/navigation";

function isAssembledDesign(value: unknown): value is AssembledDesign {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.slides);
}

function parsePersistedDesign(output: unknown): AssembledDesign | null {
  if (!isAssembledDesign(output)) return null;

  return {
    slides: output.slides as SlideState[],
    paletteOptions: output.paletteOptions ?? [],
    activePaletteId: output.activePaletteId ?? null,
    slideCount: output.slideCount ?? output.slides.length,
  };
}

export default async function PersistedDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const row = await prisma.prompt.findUnique({ where: { id } });
  if (!row) notFound();

  const design = parsePersistedDesign(row.output);
  if (!design) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-2xl font-bold">Design in progress</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-neutral-600">
            {row.prompt}
          </p>
          <p className="mt-4 text-neutral-500">
            Slides have not been saved yet. Check back once generation completes.
          </p>
        </div>
      </main>
    );
  }

  return <PersistedDesignView prompt={row.prompt} design={design} />;
}
