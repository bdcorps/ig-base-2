"use client";

import GenerationPreviewCard from "@/components/GenerationPreviewCard";
import PromptBox, { EXAMPLE_PROMPTS } from "@/components/PromptBox";
import SignInModal from "@/components/SignInModal";
import TemplateCard from "@/components/templates/TemplateCard";
import TemplatePreviewSheet from "@/components/templates/TemplatePreviewSheet";
import { useGenerations } from "@/context/GenerationsContext";
import { useSession } from "@/lib/auth-client";
import { googleFontsHref } from "@/lib/fonts";
import {
  TEMPLATE_GROUPS,
  findTemplate,
  templateFontFamilies,
  type CarouselTemplate,
} from "@/lib/templates";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PENDING_GENERATION_KEY = "pendingGeneration";

const ROW_SIZE = 4;

function StudioSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-md font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    generations,
    deleteGeneration,
    startGeneration,
    importFromEditorSession,
    loadSampleDesign,
  } = useGenerations();
  const { data: session, isPending: sessionPending } = useSession();
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [slideCount, setSlideCount] = useState(5);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CarouselTemplate | null>(null);

  const recentGenerations = generations.slice(0, ROW_SIZE);
  const featuredTemplates = useMemo(
    () =>
      TEMPLATE_GROUPS.flatMap((group) =>
        group.categories.flatMap((category) => category.templates),
      ).slice(0, ROW_SIZE),
    [],
  );

  // Load the Google Fonts used by the template covers so they render correctly.
  useEffect(() => {
    const id = "studio-template-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = googleFontsHref(templateFontFamilies());
  }, []);

  useEffect(() => {
    const id = importFromEditorSession();
    if (id) router.replace(`/design/${id}`);
  }, [importFromEditorSession, router]);

  // Pre-select a template chosen from the Templates gallery (/?template=<id>).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("template");
    if (id && findTemplate(id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the ?template param on mount
      setTemplateId(id);
      // Clear the query param so a refresh/back doesn't re-apply it.
      router.replace("/");
    }
  }, [router]);

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
    <div className="relative overflow-y-auto">
      <div className="relative z-10 items-center justify-center px-8 py-8 flex flex-col min-h-[55vh]">
        <div className="mb-8 text-center max-w-xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 leading-normal">
            Make viral carousels for your IG feed with Carousel Studio (Beta)
          </h1>
          {/* <p className="text-[13px] text-gray-500">Go to Claude, get a prompt for a carousel, paste it in and watch the magic happen.</p> */}
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
          className="mt-6 cursor-pointer text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
        >
          See demo
        </button>
      </div>

      <div className="mx-auto mt-12 w-full max-w-5xl px-6 pb-16">
        {recentGenerations.length > 0 && (
          <StudioSection title="Recents" href="/designs">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {recentGenerations.map((gen) => (
                <GenerationPreviewCard
                  key={gen.id}
                  generation={gen}
                  onOpen={() => router.push(`/design/${gen.id}`)}
                  onDelete={() => deleteGeneration(gen.id)}
                />
              ))}
            </div>
          </StudioSection>
        )}

        <StudioSection title="Templates" href="/templates">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={setPreviewTemplate}
                fluid
              />
            ))}
          </div>
        </StudioSection>
      </div>

      <TemplatePreviewSheet
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} callbackURL="/" />
    </div>
  );
}
