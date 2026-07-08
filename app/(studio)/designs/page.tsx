"use client";

import GenerationPreviewCard from "@/components/GenerationPreviewCard";
import { useGenerations } from "@/context/GenerationsContext";
import { useRouter } from "next/navigation";

export default function DesignsPage() {
  const router = useRouter();
  const { generations, deleteGeneration } = useGenerations();

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Designs</h1>
      {generations.length === 0 ? (
        <p className="text-[13px] text-neutral-500">
          You haven&apos;t created any carousels yet.
        </p>
      ) : (
        <div className="grid w-full max-w-5xl grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {generations.map((gen) => (
            <GenerationPreviewCard
              key={gen.id}
              generation={gen}
              onOpen={() => router.push(`/design/${gen.id}`)}
              onDelete={() => deleteGeneration(gen.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
