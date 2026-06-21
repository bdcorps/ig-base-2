"use client";

import PromptBox, { EXAMPLE_PROMPTS } from "@/components/PromptBox";
import { useGenerations } from "@/context/GenerationsContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const { startGeneration, importFromEditorSession, loadSampleDesign } = useGenerations();
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [slideCount, setSlideCount] = useState(5);

  useEffect(() => {
    const id = importFromEditorSession();
    if (id) router.replace(`/design/${id}`);
  }, [importFromEditorSession, router]);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const id = startGeneration(trimmed, slideCount);
    router.push(`/design/${id}`);
  }

  function handleOpenSample() {
    const id = loadSampleDesign();
    router.push(`/design/${id}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-normal text-gray-700">
            What did you wanna make today?
          </h1>
        </div>
        <PromptBox
          prompt={prompt}
          slideCount={slideCount}
          onPromptChange={setPrompt}
          onSlideCountChange={setSlideCount}
          onSubmit={handleGenerate}
        />
        <button
          type="button"
          onClick={handleOpenSample}
          className="mt-6 text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
        >
          See demo
        </button>
      </div>
    </div>
  );
}
