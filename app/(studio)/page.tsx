"use client";

import GenerationPreviewCard from "@/components/GenerationPreviewCard";
import PromptBox, { EXAMPLE_PROMPTS } from "@/components/PromptBox";
import SignInModal from "@/components/SignInModal";
import { useGenerations } from "@/context/GenerationsContext";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PENDING_GENERATION_KEY = "pendingGeneration";

export default function Home() {
  const router = useRouter();
  const { generations, startGeneration, importFromEditorSession, loadSampleDesign } =
    useGenerations();
  const { data: session, isPending: sessionPending } = useSession();
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [slideCount, setSlideCount] = useState(5);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const id = importFromEditorSession();
    if (id) router.replace(`/design/${id}`);
  }, [importFromEditorSession, router]);

  // Resume a generation that was pending before the user signed in.
  useEffect(() => {
    if (sessionPending || !session?.user) return;
    const raw = localStorage.getItem(PENDING_GENERATION_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_GENERATION_KEY);
    try {
      const pending = JSON.parse(raw) as {
        prompt: string;
        slideCount: number;
        templateId?: string | null;
      };
      if (pending.prompt?.trim()) {
        startGeneration(
          pending.prompt.trim(),
          pending.slideCount,
          pending.templateId ?? null,
        );
      }
    } catch {
      // Ignore malformed pending state.
    }
  }, [session, sessionPending, startGeneration]);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (!session?.user) {
      localStorage.setItem(
        PENDING_GENERATION_KEY,
        JSON.stringify({ prompt: trimmed, slideCount, templateId }),
      );
      setSignInOpen(true);
      return;
    }
    startGeneration(trimmed, slideCount, templateId);
  }

  function handleOpenSample() {
    const id = loadSampleDesign();
    router.push(`/design/${id}`);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72"
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-normal text-gray-700">
            Make viral carousels for your IG feed with Carousel Studio (Beta)
          </h1>
          <p className="text-[13px] text-gray-500">Go to Claude, get a prompt for a carousel, paste it in and watch the magic happen.</p>
        </div>
        <PromptBox
          prompt={prompt}
          slideCount={slideCount}
          templateId={templateId}
          onPromptChange={setPrompt}
          onSlideCountChange={setSlideCount}
          onTemplateChange={setTemplateId}
          onSubmit={handleGenerate}
        />
        <button
          type="button"
          onClick={handleOpenSample}
          className="mt-6 text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
        >
          See demo
        </button>
        {generations.length > 0 && (
          <div className="mt-12 grid w-full max-w-5xl grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {generations.map((gen) => (
              <GenerationPreviewCard
                key={gen.id}
                generation={gen}
                onOpen={() => router.push(`/design/${gen.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} callbackURL="/" />
    </div>
  );
}
