"use client";

import { ArrowUp } from "lucide-react";

const EXAMPLE_PROMPTS = [
  `Create a personal brand 4-slide carousel for Sukhpal Saini, a founder of a personal branding agency.
  
  Style: Modern, high-contrast, founder/personal brand aesthetic. Clean layouts, bold headlines, minimal clutter. Use purple accents. Include subtle branding with @itssukhpalsaini on every slide.

Slide 1 — Cover

Headline:
How to Start a Personal Brand (Without Overthinking It)

Subheadline:
A simple roadmap that actually works.

Footer:
Sukhpal Saini | Founder | @itssukhpalsaini

Visual:
Large title with a creator/founder aesthetic and subtle social icons.

Slide 2 — Stop Trying to Go Viral

Headline:
Step 1: Stop trying to go viral

Body:
Most people fail because they optimize for views instead of trust.

You don't need millions of followers.

You need a small audience that knows:

• What you do
• What you know
• Why they should listen

Consistency beats virality.

Visual:
Viral graph fading vs trust graph rising steadily.

Slide 3 — Pick One Topic

Headline:
Step 2: Become known for one thing

Body:
Don't talk about everything.

Choose one topic people will associate with your name.

Examples:

• SaaS growth
• AI tools
• Design
• Fitness
• Finance
• Career advice

People follow specialists before they follow personalities.

Quote Highlight:
Clarity creates authority.

Slide 4 — What Happened When I Started

Headline:
My personal brand changed everything

Body:
Sharing what I was building led to:

• New friendships

• Customers

• Opportunities

• Speaking invitations

• A bigger network

You never know who's watching.

Start before you feel ready.

Footer:
Sukhpal Saini
Founder
@itssukhpalsaini

CTA:
Follow @itssukhpalsaini for more founder and personal branding insights.`,
  "4-slide carousel: This girl went from zero to $300k MRR by hacking virality and got 500M monthly views.",
  "3-slide premium minimalist carousel for an independent optician. Why expert eyewear beats a chain store.",
];

interface Props {
  prompt: string;
  slideCount: number;
  onPromptChange: (value: string) => void;
  onSlideCountChange: (value: number) => void;
  onSubmit: () => void;
}

export default function PromptBox({
  prompt,
  slideCount,
  onPromptChange,
  onSlideCountChange,
  onSubmit,
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (prompt.trim()) onSubmit();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none bg-transparent px-3 pt-3 pb-3 text-[14px] leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
          placeholder="Describe your carousel — topic, tone, slide count, and any copy you want verbatim…"
        />

        <div className="flex items-center justify-end gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!prompt.trim()}
            aria-label="Generate"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-opacity disabled:opacity-40 cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPromptChange(p)}
            className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            Example {i + 1}
          </button>
        ))}
      </div> */}
    </div>
  );
}

export { EXAMPLE_PROMPTS };
