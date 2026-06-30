import type {
  Color,
  FontRole,
  ImageElement,
  Palette,
  ShapeElement,
  SlideDesign,
  SlideElement,
  TextElement,
  TextSegment,
  Theme,
} from "@/lib/schema";
import aesTiredPowerfulDesign from "@/lib/template-designs/aes-tired-powerful.json";

/** A prebuilt template design loaded from JSON (the design generator's shape). */
interface PrebuiltTemplateDesign {
  design: SlideDesign;
  theme: Theme;
}

/**
 * Templates are typography-driven carousel COVERS. Each template stores compact
 * content (eyebrow / headline / footer / palette / font / layout style) plus a
 * generation `prompt`. `buildCover` turns that content into a real SlideDesign
 * that the SlideRenderer paints — so the gallery shows actual rendered covers
 * (à la the reference look) rather than stock photos. Clicking a template opens
 * a sheet where the user adds their own prompt to generate a customized version.
 */

export type CoverStyle = "editorial" | "boldLeft" | "number" | "list" | "aesthetic";

export type PaletteId =
  | "cream"
  | "dark"
  | "navy"
  | "forest"
  | "blue"
  | "blush"
  | "sage"
  | "butter"
  | "mono"
  | "plum"
  | "linen"
  | "olive"
  | "fog"
  | "clay"
  | "mist";

export type FontPairId =
  | "playfair"
  | "fraunces"
  | "dmserif"
  | "archivo"
  | "anton"
  | "bebas";

export interface CarouselTemplate {
  id: string;
  title: string;
  category: string;
  group: "goal" | "industry" | "aesthetic";
  style: CoverStyle;
  paletteId: PaletteId;
  fontPair: FontPairId;
  eyebrow?: string;
  headline: string;
  /** A word/phrase inside the headline to paint in the accent color. */
  highlight?: string;
  footer?: string;
  /** Large figure used by the "number" style (e.g. "5" or "92%"). */
  figure?: string;
  /**
   * Optional cover background photo (path under /public). Used by the
   * "aesthetic" style to paint a real generated photo behind the type, with a
   * soft palette wash for legibility.
   */
  coverImage?: string;
  /**
   * Optional prebuilt design JSON in the SAME shape the design generator emits
   * (see /api/design). When present, the gallery renders this `SlideDesign`
   * directly instead of deriving one via `buildCover`, and `designTheme`
   * supplies its palette + fonts. The `prompt` is still used to generate a
   * customized carousel.
   */
  design?: SlideDesign;
  designTheme?: Theme;
  slideCount: number;
  prompt: string;
}

export interface TemplateCategory {
  id: string;
  title: string;
  subtitle: string;
  templates: CarouselTemplate[];
}

export interface TemplateGroup {
  id: "goal" | "industry" | "aesthetic";
  title: string;
  emoji: string;
  categories: TemplateCategory[];
}

export const PALETTES: Record<PaletteId, Palette> = {
  cream: { background: "#f3efe6", text: "#211d17", accent: "#c2603a" },
  dark: { background: "#141414", text: "#f6f3ee", accent: "#ff6b4a" },
  navy: { background: "#1b2540", text: "#f3f1e9", accent: "#ff7a6b" },
  forest: { background: "#14503e", text: "#f0fbf3", accent: "#ffd166" },
  blue: { background: "#9db4d8", text: "#182142", accent: "#e8743b" },
  blush: { background: "#f1d7cf", text: "#3a201a", accent: "#b8543c" },
  sage: { background: "#cbd4c4", text: "#283022", accent: "#6f7d54" },
  butter: { background: "#f6e6bf", text: "#2c2412", accent: "#d98324" },
  mono: { background: "#ffffff", text: "#111111", accent: "#ff5436" },
  plum: { background: "#2a1f3d", text: "#f4eefb", accent: "#c9a4ff" },
  // Soft, muted, earthy tones for the "aesthetic" covers.
  linen: { background: "#e3d9c8", text: "#403832", accent: "#9c7a5b" },
  olive: { background: "#b7bca3", text: "#2f3326", accent: "#67704a" },
  fog: { background: "#aeb9c2", text: "#2c343b", accent: "#5f7682" },
  clay: { background: "#d6bdae", text: "#43302a", accent: "#9a6450" },
  mist: { background: "#c9cdc2", text: "#2d322b", accent: "#7c8a6f" },
};

export const FONT_PAIRS: Record<FontPairId, { heading: string; body: string }> = {
  playfair: { heading: "Playfair Display", body: "Inter" },
  fraunces: { heading: "Fraunces", body: "Work Sans" },
  dmserif: { heading: "DM Serif Display", body: "Manrope" },
  archivo: { heading: "Archivo Black", body: "Inter" },
  anton: { heading: "Anton", body: "Inter" },
  bebas: { heading: "Bebas Neue", body: "Inter" },
};

// ---------------------------------------------------------------------------
// Cover builder
// ---------------------------------------------------------------------------

function txt(o: {
  x: number;
  y: number;
  width: number;
  content: string;
  font?: FontRole;
  fontSize: number;
  fontWeight?: number;
  color?: Color;
  align?: "left" | "center" | "right";
  italic?: boolean;
  uppercase?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  segments?: TextSegment[];
  background?: Color;
  paddingX?: number;
  paddingY?: number;
  borderRadius?: number;
  rotation?: number;
}): TextElement {
  return {
    kind: "text",
    x: o.x,
    y: o.y,
    width: o.width,
    rotation: o.rotation ?? 0,
    content: o.content,
    segments: o.segments,
    font: o.font ?? "heading",
    fontSize: o.fontSize,
    fontWeight: o.fontWeight ?? 700,
    color: o.color ?? "text",
    align: o.align ?? "left",
    italic: o.italic ?? false,
    uppercase: o.uppercase ?? false,
    lineHeight: o.lineHeight ?? 1.1,
    letterSpacing: o.letterSpacing ?? 0,
    background: o.background,
    paddingX: o.paddingX ?? 0,
    paddingY: o.paddingY ?? 0,
    borderRadius: o.borderRadius ?? 0,
  };
}

function rect(o: {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: Color;
  borderRadius?: number;
}): ShapeElement {
  return {
    kind: "shape",
    x: o.x,
    y: o.y,
    width: o.width,
    rotation: 0,
    height: o.height,
    variant: "rect",
    color: o.color ?? "accent",
    borderRadius: o.borderRadius ?? 0,
  };
}

function img(o: {
  x: number;
  y: number;
  width: number;
  height: number;
  imageId: string;
  fit?: "cover" | "contain";
  borderRadius?: number;
}): ImageElement {
  return {
    kind: "image",
    x: o.x,
    y: o.y,
    width: o.width,
    rotation: 0,
    height: o.height,
    imageId: o.imageId,
    fit: o.fit ?? "cover",
    borderRadius: o.borderRadius ?? 0,
  };
}

/** Shrink the headline as it gets longer so covers stay balanced. */
function autoSize(headline: string, max: number, min: number): number {
  const len = headline.length;
  if (len <= 18) return max;
  if (len >= 72) return min;
  const t = (len - 18) / (72 - 18);
  return Math.round(max - t * (max - min));
}

function headlineSegments(
  headline: string,
  highlight?: string,
  opts: { color?: Color; italic?: boolean } = { color: "accent" },
): TextSegment[] | undefined {
  if (!highlight) return undefined;
  const idx = headline.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return undefined;
  const before = headline.slice(0, idx);
  const mid = headline.slice(idx, idx + highlight.length);
  const after = headline.slice(idx + highlight.length);
  const segs: TextSegment[] = [];
  if (before) segs.push({ text: before });
  segs.push({ text: mid, color: opts.color, italic: opts.italic });
  if (after) segs.push({ text: after });
  return segs;
}

export function buildCover(t: CarouselTemplate): SlideDesign {
  // Templates carrying prebuilt design JSON (the generator's shape) render it
  // directly — no derivation.
  if (t.design) return t.design;

  const segments = headlineSegments(t.headline, t.highlight);
  const elements: SlideElement[] = [];

  if (t.style === "editorial") {
    if (t.eyebrow)
      elements.push(
        txt({
          x: 120,
          y: 250,
          width: 840,
          content: t.eyebrow,
          font: "body",
          fontSize: 28,
          fontWeight: 600,
          align: "center",
          uppercase: true,
          letterSpacing: 8,
          color: "accent",
        }),
      );
    elements.push(rect({ x: 510, y: 365, width: 60, height: 5, borderRadius: 3 }));
    elements.push(
      txt({
        x: 110,
        y: 460,
        width: 860,
        content: t.headline,
        segments,
        fontSize: autoSize(t.headline, 122, 60),
        fontWeight: 600,
        align: "center",
        lineHeight: 1.04,
      }),
    );
    if (t.footer)
      elements.push(
        txt({
          x: 120,
          y: 1095,
          width: 840,
          content: t.footer,
          font: "body",
          fontSize: 26,
          fontWeight: 500,
          align: "center",
          uppercase: true,
          letterSpacing: 5,
        }),
      );
  } else if (t.style === "boldLeft") {
    if (t.eyebrow)
      elements.push(
        txt({
          x: 110,
          y: 230,
          width: 800,
          content: t.eyebrow,
          font: "body",
          fontSize: 30,
          fontWeight: 700,
          uppercase: true,
          letterSpacing: 4,
          color: "accent",
        }),
      );
    elements.push(
      txt({
        x: 110,
        y: 370,
        width: 880,
        content: t.headline,
        segments,
        fontSize: autoSize(t.headline, 138, 66),
        fontWeight: 800,
        uppercase: true,
        lineHeight: 0.98,
        align: "left",
      }),
    );
    if (t.footer)
      elements.push(
        txt({
          x: 110,
          y: 1120,
          width: 820,
          content: t.footer,
          font: "body",
          fontSize: 30,
          fontWeight: 700,
          uppercase: true,
          letterSpacing: 3,
          color: "accent",
        }),
      );
  } else if (t.style === "number") {
    elements.push(
      txt({
        x: 100,
        y: 150,
        width: 700,
        content: t.figure ?? String(t.slideCount),
        fontSize: 380,
        color: "accent",
        align: "left",
        lineHeight: 0.85,
      }),
    );
    if (t.eyebrow)
      elements.push(
        txt({
          x: 116,
          y: 560,
          width: 840,
          content: t.eyebrow,
          font: "body",
          fontSize: 28,
          fontWeight: 700,
          uppercase: true,
          letterSpacing: 6,
          color: "text",
        }),
      );
    elements.push(
      txt({
        x: 110,
        y: 650,
        width: 870,
        content: t.headline,
        segments,
        fontSize: autoSize(t.headline, 102, 56),
        fontWeight: 700,
        align: "left",
        lineHeight: 1.02,
      }),
    );
    if (t.footer)
      elements.push(
        txt({
          x: 110,
          y: 1150,
          width: 820,
          content: t.footer,
          font: "body",
          fontSize: 28,
          fontWeight: 700,
          uppercase: true,
          letterSpacing: 3,
          color: "accent",
        }),
      );
  } else if (t.style === "aesthetic") {
    // Soft editorial cover: a "YOUR NAME · year · YOUR NICHE" header bar, a
    // serif headline with an italic highlighted phrase, and a small caption.
    const headerFont = {
      font: "body" as FontRole,
      fontSize: 22,
      fontWeight: 600,
      uppercase: true,
      letterSpacing: 4,
      color: "text" as Color,
    };
    elements.push(txt({ x: 90, y: 72, width: 320, content: "YOUR NAME", align: "left", ...headerFont }));
    elements.push(
      txt({ x: 380, y: 72, width: 320, content: t.figure ?? "2025", align: "center", ...headerFont }),
    );
    elements.push(
      txt({
        x: 670,
        y: 72,
        width: 320,
        content: t.eyebrow ?? "YOUR NICHE",
        align: "right",
        ...headerFont,
      }),
    );
    elements.push(rect({ x: 90, y: 132, width: 900, height: 1, color: "text", borderRadius: 0 }));
    elements.push(
      txt({
        x: 110,
        y: 360,
        width: 860,
        content: t.headline,
        segments: headlineSegments(t.headline, t.highlight, { italic: true }),
        fontSize: autoSize(t.headline, 100, 54),
        fontWeight: 500,
        align: "center",
        lineHeight: 1.1,
      }),
    );
    if (t.footer)
      elements.push(
        txt({
          x: 190,
          y: 760,
          width: 700,
          content: t.footer,
          font: "body",
          fontSize: 28,
          fontWeight: 400,
          italic: true,
          align: "center",
          letterSpacing: 1,
          lineHeight: 1.35,
        }),
      );
  } else {
    // list
    if (t.eyebrow)
      elements.push(
        txt({
          x: 140,
          y: 300,
          width: 800,
          content: t.eyebrow,
          font: "body",
          fontSize: 28,
          fontWeight: 600,
          align: "center",
          uppercase: true,
          letterSpacing: 8,
          color: "accent",
        }),
      );
    elements.push(
      txt({
        x: 120,
        y: 470,
        width: 840,
        content: t.headline,
        segments,
        fontSize: autoSize(t.headline, 116, 58),
        fontWeight: 600,
        italic: true,
        align: "center",
        lineHeight: 1.05,
      }),
    );
    elements.push(
      txt({
        x: 140,
        y: 1085,
        width: 800,
        content: `1 of ${t.slideCount}`,
        font: "body",
        fontSize: 26,
        fontWeight: 600,
        align: "center",
        uppercase: true,
        letterSpacing: 4,
      }),
    );
  }

  if (t.style === "aesthetic" && t.coverImage) {
    // Compose the photo INTO the design as a matted, framed image element (not
    // a full-bleed background) sitting on the solid palette color. The header
    // bar / headline / caption are layered on top of the photo.
    const frame = { x: 60, y: 60, width: 960, height: 1230, borderRadius: 24 };
    const photo = img({ ...frame, imageId: "cover" });
    return {
      background: { type: "solid", color: "background" },
      elements: [photo, ...elements],
      images: { cover: { url: t.coverImage, prompt: t.headline } },
    };
  }

  return {
    background: { type: "solid", color: "background" },
    elements,
    images: {},
  };
}

export function themeFor(t: CarouselTemplate): Theme {
  if (t.designTheme) return t.designTheme;
  return { palette: PALETTES[t.paletteId], fonts: FONT_PAIRS[t.fontPair] };
}

export function templateFontFamilies(): string[] {
  const families = new Set<string>();
  for (const group of TEMPLATE_GROUPS) {
    for (const category of group.categories) {
      for (const tpl of category.templates) {
        const pair = FONT_PAIRS[tpl.fontPair];
        families.add(pair.heading);
        families.add(pair.body);
      }
    }
  }
  return Array.from(families);
}

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

type TemplateSeed = Omit<CarouselTemplate, "category" | "group">;

function cat(
  group: "goal" | "industry" | "aesthetic",
  id: string,
  title: string,
  subtitle: string,
  seeds: TemplateSeed[],
): TemplateCategory {
  return {
    id,
    title,
    subtitle,
    templates: seeds.map((s) => ({ ...s, category: id, group })),
  };
}

const GOAL_CATEGORIES: TemplateCategory[] = [
  cat("goal", "get-more-clients", "Get More Clients", "Turn followers into booked calls", [
    {
      id: "clients-pain",
      title: "Pain Point Hook",
      style: "boldLeft",
      paletteId: "navy",
      fontPair: "anton",
      eyebrow: "Read this first",
      headline: "Struggling to find clients who actually pay?",
      highlight: "actually pay",
      footer: "Swipe →",
      slideCount: 7,
      prompt:
        "Create a 7-slide Instagram carousel that helps a service business attract better-paying clients. Open with the pain point 'Struggling to find clients who actually pay?', then walk through why it happens and 3 fixes, ending with a clear DM/booking CTA. Confident, direct tone.",
    },
    {
      id: "clients-offer",
      title: "Free Audit Offer",
      style: "editorial",
      paletteId: "cream",
      fontPair: "playfair",
      eyebrow: "Limited spots",
      headline: "Get a free strategy audit this week",
      footer: "Comment AUDIT to claim",
      slideCount: 5,
      prompt:
        "Create a 5-slide Instagram carousel promoting a free strategy audit. Slide 1 headline 'Get a free strategy audit this week.' Explain what they'll get, who it's for, and how to claim it (comment AUDIT). Warm, premium, low-pressure tone.",
    },
    {
      id: "clients-proof",
      title: "Client Result",
      style: "number",
      paletteId: "forest",
      fontPair: "fraunces",
      figure: "3x",
      eyebrow: "Real client result",
      headline: "How one client tripled their bookings in 60 days",
      footer: "DM me 'GROW'",
      slideCount: 8,
      prompt:
        "Create an 8-slide Instagram case-study carousel. Hook: 'How one client tripled their bookings in 60 days.' Show the before, the approach, key steps, and the result, then invite the reader to DM 'GROW'. Credible, story-driven tone.",
    },
  ]),
  cat("goal", "build-trust", "Build Trust", "Show credibility and win confidence", [
    {
      id: "trust-about",
      title: "About Me",
      style: "editorial",
      paletteId: "blush",
      fontPair: "playfair",
      eyebrow: "Nice to meet you",
      headline: "Hi, here's why I do what I do",
      footer: "Swipe to learn more",
      slideCount: 6,
      prompt:
        "Create a 6-slide 'About me' Instagram carousel for a personal brand. Slide 1 'Hi, here's why I do what I do.' Share the origin story, mission, who they help, and credibility, ending with a soft follow CTA. Warm and human tone.",
    },
    {
      id: "trust-testimonial",
      title: "Testimonial",
      style: "list",
      paletteId: "sage",
      fontPair: "fraunces",
      eyebrow: "In their words",
      headline: "What working together really feels like",
      slideCount: 5,
      prompt:
        "Create a 5-slide Instagram testimonial carousel. Slide 1 'What working together really feels like.' Feature pull-quotes from happy clients with names/roles, each on its own slide, ending with a CTA to book. Clean, editorial, trust-building tone.",
    },
    {
      id: "trust-myths",
      title: "Myth vs Fact",
      style: "boldLeft",
      paletteId: "dark",
      fontPair: "archivo",
      eyebrow: "Let's clear this up",
      headline: "3 myths costing you money",
      highlight: "costing you money",
      footer: "Save this →",
      slideCount: 7,
      prompt:
        "Create a 7-slide myth-busting Instagram carousel. Hook: '3 myths costing you money.' Each slide pairs a common myth with the truth, ending with a takeaway and save CTA. Authoritative but friendly tone.",
    },
  ]),
  cat("goal", "grow-your-audience", "Grow Your Audience", "Reach new people and get followers", [
    {
      id: "grow-listicle",
      title: "Listicle Hook",
      style: "number",
      paletteId: "butter",
      fontPair: "anton",
      figure: "7",
      eyebrow: "Save for later",
      headline: "things nobody tells you about growing on Instagram",
      footer: "Follow for more",
      slideCount: 9,
      prompt:
        "Create a 9-slide value-packed Instagram carousel: '7 things nobody tells you about growing on Instagram.' One punchy tip per slide, end with a follow CTA. Energetic, no-fluff tone.",
    },
    {
      id: "grow-hot-take",
      title: "Hot Take",
      style: "boldLeft",
      paletteId: "mono",
      fontPair: "archivo",
      eyebrow: "Unpopular opinion",
      headline: "Going viral won't grow your business",
      highlight: "won't",
      footer: "Agree? →",
      slideCount: 6,
      prompt:
        "Create a 6-slide opinion Instagram carousel. Hook: 'Going viral won't grow your business.' Make the contrarian case, back it with reasoning, and give what to focus on instead. Bold, scroll-stopping tone.",
    },
    {
      id: "grow-mistakes",
      title: "Common Mistakes",
      style: "editorial",
      paletteId: "plum",
      fontPair: "playfair",
      eyebrow: "Are you doing this?",
      headline: "Are you making one of these branding mistakes?",
      slideCount: 8,
      prompt:
        "Create an 8-slide Instagram carousel: 'Are you making one of these branding mistakes?' Cover common mistakes with quick fixes, ending with a save + follow CTA. Helpful, expert tone.",
    },
  ]),
  cat("goal", "sell-your-offer", "Sell Your Offer", "Convert attention into sales", [
    {
      id: "sell-reveal",
      title: "Offer Reveal",
      style: "boldLeft",
      paletteId: "dark",
      fontPair: "anton",
      eyebrow: "Now open",
      headline: "The offer you've been waiting for is here",
      highlight: "here",
      footer: "Link in bio →",
      slideCount: 6,
      prompt:
        "Create a 6-slide Instagram launch carousel revealing a new offer. Hook: 'The offer you've been waiting for is here.' Cover what it is, who it's for, the transformation, and the CTA (link in bio). Exciting but not spammy tone.",
    },
    {
      id: "sell-value",
      title: "What's Included",
      style: "list",
      paletteId: "blue",
      fontPair: "fraunces",
      eyebrow: "Everything you get",
      headline: "Here's exactly what's inside",
      slideCount: 7,
      prompt:
        "Create a 7-slide Instagram carousel breaking down everything included in an offer. Slide 1 'Here's exactly what's inside.' One deliverable/benefit per slide with its value, ending with pricing and CTA. Clear, value-stacked tone.",
    },
    {
      id: "sell-objection",
      title: "Objection Handler",
      style: "editorial",
      paletteId: "cream",
      fontPair: "playfair",
      eyebrow: "Still on the fence?",
      headline: "Think you can't afford it? Read this",
      slideCount: 6,
      prompt:
        "Create a 6-slide Instagram carousel that handles the top objections to buying an offer. Hook: 'Think you can't afford it? Read this.' Address price, time, and 'will it work for me', ending with reassurance and CTA. Empathetic, confident tone.",
    },
  ]),
  cat("goal", "celebrate-milestones", "Celebrate Milestones", "Share wins and build momentum", [
    {
      id: "milestone-thankyou",
      title: "Thank You",
      style: "editorial",
      paletteId: "blush",
      fontPair: "fraunces",
      eyebrow: "A big moment",
      headline: "Thank you for being part of this",
      footer: "Here's to what's next",
      slideCount: 5,
      prompt:
        "Create a 5-slide celebratory Instagram carousel thanking the community for a milestone (e.g. follower count, anniversary, launch). Warm, grateful tone with a forward-looking close.",
    },
    {
      id: "milestone-number",
      title: "Big Number",
      style: "number",
      paletteId: "forest",
      fontPair: "anton",
      figure: "1K",
      eyebrow: "We just hit",
      headline: "clients served and we're just getting started",
      footer: "Thank you",
      slideCount: 6,
      prompt:
        "Create a 6-slide Instagram carousel celebrating a big number milestone (e.g. '1K clients served'). Share the journey, lessons learned, and gratitude, ending on momentum. Proud, humble tone.",
    },
    {
      id: "milestone-journey",
      title: "The Journey",
      style: "list",
      paletteId: "sage",
      fontPair: "playfair",
      eyebrow: "How it started",
      headline: "From day one to today",
      slideCount: 8,
      prompt:
        "Create an 8-slide Instagram 'journey' carousel showing the path from the beginning to a recent milestone. Each slide a chapter or lesson, ending with thanks and what's next. Reflective, inspiring tone.",
    },
  ]),
  cat("goal", "answer-faqs", "Answer FAQs", "Educate and reduce buying friction", [
    {
      id: "faq-top",
      title: "Top Questions",
      style: "list",
      paletteId: "butter",
      fontPair: "fraunces",
      eyebrow: "You asked, I answered",
      headline: "Your top questions, answered",
      slideCount: 7,
      prompt:
        "Create a 7-slide Instagram FAQ carousel. Slide 1 'Your top questions, answered.' One frequently asked question per slide with a clear, helpful answer, ending with a 'DM me your questions' CTA. Friendly, informative tone.",
    },
    {
      id: "faq-how",
      title: "How It Works",
      style: "number",
      paletteId: "blue",
      fontPair: "anton",
      figure: "3",
      eyebrow: "The process",
      headline: "steps to work with me",
      footer: "Save this →",
      slideCount: 6,
      prompt:
        "Create a 6-slide Instagram carousel explaining how to work with you in 3 simple steps. Reduce friction, set expectations, and end with how to start. Clear, reassuring tone.",
    },
    {
      id: "faq-misconception",
      title: "Did You Know",
      style: "editorial",
      paletteId: "plum",
      fontPair: "playfair",
      eyebrow: "Good to know",
      headline: "The thing most people get wrong",
      slideCount: 6,
      prompt:
        "Create a 6-slide educational Instagram carousel correcting a common misconception in your field. Hook: 'The thing most people get wrong.' Explain the misconception, the truth, and what to do instead. Expert, approachable tone.",
    },
  ]),
];

/** Build 3 cover variations for an industry from a single role-flavored seed. */
function industryTrio(
  id: string,
  role: string,
  topic: string,
  audience: string,
  palettes: [PaletteId, PaletteId, PaletteId],
): TemplateSeed[] {
  return [
    {
      id: `${id}-tips`,
      title: "Quick Tips",
      style: "number",
      paletteId: palettes[0],
      fontPair: "anton",
      figure: "5",
      eyebrow: `${role} tips`,
      headline: `ways to ${topic}`,
      footer: "Save this →",
      slideCount: 7,
      prompt: `Create a 7-slide value Instagram carousel for a ${role}: '5 ways to ${topic}.' One actionable tip per slide for ${audience}, ending with a save + follow CTA. Helpful, expert tone.`,
    },
    {
      id: `${id}-story`,
      title: "Client Win",
      style: "editorial",
      paletteId: palettes[1],
      fontPair: "playfair",
      eyebrow: "Real result",
      headline: `How I help ${audience}`,
      footer: "DM to work together",
      slideCount: 6,
      prompt: `Create a 6-slide Instagram carousel for a ${role} showcasing how they help ${audience}. Tell a relatable transformation story and end with a booking CTA. Warm, credible tone.`,
    },
    {
      id: `${id}-myth`,
      title: "Myth Buster",
      style: "boldLeft",
      paletteId: palettes[2],
      fontPair: "archivo",
      eyebrow: "Let's be honest",
      headline: `The biggest myth about ${topic}`,
      highlight: "myth",
      footer: "Swipe →",
      slideCount: 6,
      prompt: `Create a 6-slide myth-busting Instagram carousel for a ${role}: 'The biggest myth about ${topic}.' Bust the myth for ${audience}, share the truth, and give the better approach. Confident, friendly tone.`,
    },
  ];
}

const INDUSTRY_CATEGORIES: TemplateCategory[] = [
  cat(
    "industry",
    "coaching-consulting",
    "Coaching & Consulting",
    "Business, life, career, mindset, executive coaches & consultants",
    industryTrio(
      "coaching",
      "coach",
      "reach your goals faster",
      "ambitious professionals",
      ["navy", "cream", "dark"],
    ),
  ),
  cat(
    "industry",
    "health-wellness",
    "Health & Wellness",
    "Fitness coaches, trainers, nutritionists, therapists & more",
    industryTrio(
      "wellness",
      "wellness pro",
      "feel your best",
      "busy people",
      ["forest", "sage", "dark"],
    ),
  ),
  cat(
    "industry",
    "beauty",
    "Beauty",
    "Makeup, hair, lashes, nails, esthetics & PMU artists",
    industryTrio(
      "beauty",
      "beauty artist",
      "look and feel stunning",
      "your clients",
      ["blush", "plum", "mono"],
    ),
  ),
  cat(
    "industry",
    "creative-services",
    "Creative Services",
    "Designers, photographers, videographers & copywriters",
    industryTrio(
      "creative",
      "creative pro",
      "stand out with great design",
      "small brands",
      ["mono", "butter", "dark"],
    ),
  ),
  cat(
    "industry",
    "marketing",
    "Marketing",
    "Social media managers, agencies, creators & marketers",
    industryTrio(
      "marketing",
      "marketer",
      "grow your brand online",
      "growing businesses",
      ["dark", "blue", "plum"],
    ),
  ),
  cat(
    "industry",
    "real-estate",
    "Real Estate",
    "Realtors, brokers, interior designers & home stagers",
    industryTrio(
      "realestate",
      "realtor",
      "buy or sell with confidence",
      "home buyers and sellers",
      ["navy", "cream", "blue"],
    ),
  ),
  cat(
    "industry",
    "ecommerce",
    "Ecommerce",
    "Boutiques, product brands, makers & online shops",
    industryTrio(
      "ecommerce",
      "shop owner",
      "shop smarter",
      "your customers",
      ["blush", "butter", "dark"],
    ),
  ),
  cat(
    "industry",
    "professional-services",
    "Professional Services",
    "Accountants, lawyers, advisors & virtual assistants",
    industryTrio(
      "professional",
      "professional",
      "stay organized and compliant",
      "small business owners",
      ["navy", "cream", "mono"],
    ),
  ),
  cat(
    "industry",
    "education",
    "Education",
    "Course creators, online teachers, tutors & language teachers",
    industryTrio(
      "education",
      "educator",
      "learn faster",
      "students and learners",
      ["forest", "butter", "plum"],
    ),
  ),
  cat(
    "industry",
    "events",
    "Events",
    "Wedding & event planners, florists and decor businesses",
    industryTrio(
      "events",
      "event planner",
      "plan an unforgettable event",
      "couples and hosts",
      ["blush", "sage", "cream"],
    ),
  ),
  cat(
    "industry",
    "food",
    "Food",
    "Bakeries, home bakers, cafes & meal prep businesses",
    industryTrio(
      "food",
      "food business",
      "make it irresistible",
      "hungry locals",
      ["butter", "blush", "forest"],
    ),
  ),
  cat(
    "industry",
    "other-small-business",
    "Other Small Businesses",
    "Cleaning, pet, travel, nonprofit & local service businesses",
    industryTrio(
      "smallbiz",
      "local business",
      "win more local customers",
      "people nearby",
      ["blue", "sage", "navy"],
    ),
  ),
];

/** Soft, introspective personal-brand cover (see the "aesthetic" cover style). */
function aestheticSeed(o: {
  id: string;
  title: string;
  paletteId: PaletteId;
  fontPair: FontPairId;
  niche: string;
  headline: string;
  highlight?: string;
  caption: string;
  slideCount?: number;
}): TemplateSeed {
  const slideCount = o.slideCount ?? 1;
  return {
    id: o.id,
    title: o.title,
    style: "aesthetic",
    paletteId: o.paletteId,
    fontPair: o.fontPair,
    eyebrow: o.niche,
    headline: o.headline,
    highlight: o.highlight,
    footer: o.caption,
    coverImage: `/templates/${o.id}.png`,
    slideCount,
    prompt: `Create a ${slideCount}-slide aesthetic, emotionally resonant Instagram carousel on the theme "${o.headline}". Soft, introspective, personal-growth tone. Use a calm muted color palette, an elegant serif headline with select words set in italic, gentle film-style photography, and a minimal "name · year · niche" header bar on each slide. Open with the cover line "${o.headline}" and the supporting line "${o.caption}", then expand the idea across the slides with short reflective copy, ending on a soft takeaway and a quiet CTA to follow or save.`,
  };
}

const AESTHETIC_CATEGORIES: TemplateCategory[] = [
  cat(
    "aesthetic",
    "self-worth-healing",
    "Self-Worth & Healing",
    "Tender, reflective posts about worth, healing and self-acceptance",
    [
      aestheticSeed({
        id: "aes-story-matters",
        title: "Your Story Matters",
        paletteId: "clay",
        fontPair: "playfair",
        niche: "Self Growth",
        headline: "Your story matters",
        highlight: "matters",
        caption: "even the parts you wish you could erase",
      }),
      {
        // Loaded from JSON in the generator's design shape (proof of concept).
        ...aestheticSeed({
          id: "aes-tired-powerful",
          title: "Tired & Powerful",
          paletteId: "fog",
          fontPair: "fraunces",
          niche: "Mindset",
          headline: "You can be tired and still be powerful",
          highlight: "powerful",
          caption: "you don't have to prove anything to anyone",
        }),
        design: (aesTiredPowerfulDesign as unknown as PrebuiltTemplateDesign).design,
        designTheme: (aesTiredPowerfulDesign as unknown as PrebuiltTemplateDesign).theme,
      },
      aestheticSeed({
        id: "aes-body-feels",
        title: "Your Body Feels",
        paletteId: "linen",
        fontPair: "dmserif",
        niche: "Wellness",
        headline: "The pain you ignore, your body feels",
        highlight: "ignore",
        caption: "a symptom is also a form of language",
      }),
      aestheticSeed({
        id: "aes-self-expression",
        title: "Fear of Expression",
        paletteId: "olive",
        fontPair: "playfair",
        niche: "Self Expression",
        headline: "The origin of the fear of self-expression",
        highlight: "fear",
        caption: "silence is also a symptom",
      }),
    ],
  ),
  cat(
    "aesthetic",
    "rest-boundaries",
    "Rest & Boundaries",
    "Gentle reminders about rest, softness and emotional limits",
    [
      aestheticSeed({
        id: "aes-breathe",
        title: "Breathe, Don't Produce",
        paletteId: "mist",
        fontPair: "fraunces",
        niche: "Rest",
        headline: "You need to breathe, not just produce",
        highlight: "breathe",
        caption: "rest is as important as your goals",
      }),
      aestheticSeed({
        id: "aes-gentle",
        title: "Gentle Isn't Weak",
        paletteId: "clay",
        fontPair: "playfair",
        niche: "Self Care",
        headline: "Being gentle doesn't mean being weak",
        highlight: "gentle",
        caption: "it means choosing to live with intention",
      }),
      aestheticSeed({
        id: "aes-emotional-overload",
        title: "Emotional Overload",
        paletteId: "fog",
        fontPair: "dmserif",
        niche: "Emotions",
        headline: "It wasn't drama, it was emotional overload",
        highlight: "emotional overload",
        caption: "everything makes sense once you understand that",
      }),
      aestheticSeed({
        id: "aes-growth-visible",
        title: "Quiet Growth",
        paletteId: "olive",
        fontPair: "fraunces",
        niche: "Growth",
        headline: "Not every growth is visible",
        highlight: "visible",
        caption: "some are quiet and happen within",
      }),
    ],
  ),
  cat(
    "aesthetic",
    "reflection-presence",
    "Reflection & Presence",
    "Slow, journaling-style prompts about presence and coming home to yourself",
    [
      aestheticSeed({
        id: "aes-presence-heals",
        title: "Presence Heals",
        paletteId: "mist",
        fontPair: "playfair",
        niche: "Mindfulness",
        headline: "Presence heals, haste hides",
        highlight: "heals",
        caption: "coming back to yourself is the beginning of freedom",
      }),
      aestheticSeed({
        id: "aes-holds-you-back",
        title: "What Holds You Back",
        paletteId: "linen",
        fontPair: "fraunces",
        niche: "Reflection",
        headline: "What still holds you back, even if it's invisible?",
        highlight: "invisible",
        caption: "what's holding you might not be real",
      }),
      aestheticSeed({
        id: "aes-reconnect",
        title: "Reconnect With You",
        paletteId: "fog",
        fontPair: "dmserif",
        niche: "Journaling",
        headline: "3 questions to help you reconnect with your essence",
        highlight: "reconnect",
        caption: "if you feel lost, it's time to look within",
        slideCount: 7,
      }),
      aestheticSeed({
        id: "aes-advice-past",
        title: "Advice to Past Me",
        paletteId: "clay",
        fontPair: "playfair",
        niche: "Reflection",
        headline: "Advice I'd give to the version of me from five years ago",
        highlight: "five years ago",
        caption: "and it might make sense to you too",
      }),
    ],
  ),
];

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  { id: "aesthetic", title: "Browse by Aesthetic", emoji: "", categories: AESTHETIC_CATEGORIES },
  { id: "goal", title: "Browse by Goal", emoji: "", categories: GOAL_CATEGORIES },
  {
    id: "industry",
    title: "Browse by Industry",
    emoji: "",
    categories: INDUSTRY_CATEGORIES,
  },
];

export function findTemplate(id: string): CarouselTemplate | undefined {
  for (const group of TEMPLATE_GROUPS) {
    for (const category of group.categories) {
      const found = category.templates.find((t) => t.id === id);
      if (found) return found;
    }
  }
  return undefined;
}
