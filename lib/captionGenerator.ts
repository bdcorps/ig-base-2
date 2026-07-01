import type { SlideDesign, SlideElement } from "@/lib/schema";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const MODEL = process.env.CAPTION_MODEL ?? "gemini-2.5-flash";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/** Pull the human-readable copy out of a single element (recursing into stacks). */
function elementText(el: SlideElement): string[] {
  if (el.kind === "text") {
    return el.content ? [el.content.trim()] : [];
  }
  if (el.kind === "stack") {
    return el.children.flatMap((child) =>
      child.kind === "text" && child.content ? [child.content.trim()] : [],
    );
  }
  return [];
}

/** Build a compact, slide-by-slide text outline of the carousel for the model. */
export function summarizeSlides(slides: { design: SlideDesign }[]): string {
  return slides
    .map((slide, i) => {
      const lines = slide.design.elements.flatMap(elementText).filter(Boolean);
      const label = i === 0 ? "Slide 1 (hook)" : `Slide ${i + 1}`;
      return `${label}:\n${lines.length ? lines.map((l) => `  - ${l}`).join("\n") : "  (visual only)"}`;
    })
    .join("\n\n");
}

const SYSTEM_PROMPT = `You are a social media copywriter who writes high-performing Instagram captions for carousel posts.

Write a caption for the carousel described below. Requirements:
- Open with a scroll-stopping hook line that echoes the carousel's first slide.
- 2-5 short lines/sentences of value in the body. Use line breaks between thoughts (not one big block).
- Conversational, punchy, first-person brand voice. No corporate fluff.
- End with a clear call to action (e.g. save this, follow for more, share with a friend, comment below).
- Add 5-12 relevant, specific hashtags on the final line (mix of broad + niche). No banned/spammy tags.
- You may use a few tasteful emojis, but do not overdo it.
- Output ONLY the caption text itself — no preamble, no quotes, no markdown, no "Caption:" label.`;

export interface CaptionInput {
  prompt: string;
  slides: { design: SlideDesign }[];
}

export async function generateCaption({ prompt, slides }: CaptionInput): Promise<string> {
  const outline = summarizeSlides(slides);

  const { text } = await generateText({
    model: gemini(MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Original carousel brief: "${prompt}"

Carousel content, slide by slide:

${outline}

Write the Instagram caption now.`,
  });

  return text.trim();
}
