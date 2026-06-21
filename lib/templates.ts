export type TemplateCategoryId =
  | "podcasts"
  | "trending"
  | "life-coaching"
  | "sales"
  | "trust";

export interface CarouselTemplate {
  id: string;
  title: string;
  category: TemplateCategoryId;
  prompt: string;
  previewImage: string;
  thumbnailImage?: string;
  badge?: string;
  overlayLabel?: string;
  slideCount?: number;
  creatorName?: string;
  creatorAvatar?: string;
  isNew?: boolean;
}

export interface TemplateCategory {
  id: TemplateCategoryId;
  title: string;
  subtitle: string;
  displayCount?: string;
  templates: CarouselTemplate[];
}

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=540&h=720&q=80`;

const avatar = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=64&h=64&q=80`;

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "podcasts",
    title: "Podcasts",
    subtitle: "Turn episodes into scroll-stopping carousels",
    displayCount: "48",
    templates: [
      {
        id: "podcast-hook",
        title: "Episode Hook",
        category: "podcasts",
        previewImage: img("photo-1478737270239-2f02e77efc63"),
        thumbnailImage: img("photo-1590602847861-f357a9332bbc"),
        overlayLabel: "Episode Hook",
        slideCount: 10,
        creatorName: "Studio Wave",
        creatorAvatar: avatar("photo-1507003211169-0a1dd7228f2d"),
        badge: "AI MAGIC",
        prompt:
          "Podcast carousel slide 1: Bold hook — 'The one habit that changed everything.' Subtitle: key takeaway from today's episode. Warm studio aesthetic, mic icon accent. Friendly, conversational tone.",
      },
      {
        id: "podcast-quote",
        title: "Guest Quote",
        category: "podcasts",
        previewImage: img("photo-1511671782779-c97d3d27a1d4"),
        overlayLabel: "Guest Quote",
        slideCount: 7,
        creatorName: "Mic Drop",
        creatorAvatar: avatar("photo-1494790108377-be9c29b29330"),
        prompt:
          "Podcast quote slide: Large pull quote from a guest expert. Attribution line below. Clean dark background with accent highlight on one key phrase. Premium, editorial feel.",
      },
      {
        id: "podcast-takeaways",
        title: "3 Takeaways",
        category: "podcasts",
        previewImage: img("photo-1485579149621-3122dd97985f"),
        overlayLabel: "3 Takeaways",
        slideCount: 9,
        creatorName: "Audio Lab",
        creatorAvatar: avatar("photo-1438761681033-6461ffad8d80"),
        badge: "AI MAGIC",
        isNew: true,
        prompt:
          "Podcast carousel slide: '3 things you learned today' with numbered list (1, 2, 3). Punchy one-line bullets. Bright accent pills, swipe-friendly layout.",
      },
      {
        id: "podcast-cta",
        title: "Listen Now",
        category: "podcasts",
        previewImage: img("photo-1614680376573-df3480f0e6af"),
        overlayLabel: "Listen Now",
        slideCount: 6,
        creatorName: "Podcast Pro",
        creatorAvatar: avatar("photo-1500648767791-00dcc994a43e"),
        prompt:
          "Podcast CTA slide: 'New episode out now' headline. Episode title subtitle. Listen button CTA at bottom. Headphones or waveform visual accent.",
      },
    ],
  },
  {
    id: "trending",
    title: "Trending",
    subtitle: "Ride what's hot right now",
    displayCount: "268",
    templates: [
      {
        id: "trend-hot-take",
        title: "Hot Take",
        category: "trending",
        previewImage: img("photo-1521572163474-6864f9cf17ab"),
        overlayLabel: "Viral UGC Social",
        slideCount: 10,
        creatorName: "Fast Ink",
        creatorAvatar: avatar("photo-1534528741775-53994a69daeb"),
        badge: "AI MAGIC",
        isNew: true,
        prompt:
          "Trending hot-take carousel slide: Controversial hook headline that stops the scroll. Bold typography, high contrast. One supporting line. Edgy but professional.",
      },
      {
        id: "trend-listicle",
        title: "Listicle Hook",
        category: "trending",
        previewImage: img("photo-1556821840-3a63f95609a7"),
        overlayLabel: "Product Video",
        slideCount: 8,
        creatorName: "Kittl",
        creatorAvatar: avatar("photo-1611162617474-5b21e879e113"),
        prompt:
          "Trending listicle slide: '5 things nobody tells you about [topic].' Numbered teaser layout. Modern gradient background, swipe arrow CTA.",
      },
      {
        id: "trend-before-after",
        title: "Before & After",
        category: "trending",
        previewImage: img("photo-1583743814966-8936f5b7be1a"),
        thumbnailImage: img("photo-1522202176988-66273c2fd55f"),
        overlayLabel: "Before & After",
        slideCount: 7,
        creatorName: "Yopy Yuschandra",
        creatorAvatar: avatar("photo-1544005313-94ddf0286df2"),
        badge: "AI MAGIC",
        prompt:
          "Before & after transformation slide: Split concept — 'Before' vs 'After' labels. Dramatic headline about the change. Clean split layout with accent divider.",
      },
      {
        id: "trend-stat",
        title: "Stat Shock",
        category: "trending",
        previewImage: img("photo-1434389677669-e08b4cac3105"),
        overlayLabel: "Stat Shock",
        slideCount: 5,
        creatorName: "Data Drop",
        creatorAvatar: avatar("photo-1573497019940-1c28c88b4f3e"),
        prompt:
          "Stat shock slide: One massive number as the hero (e.g. '87%'). Short context line below. Data-driven, credible look with accent on the stat.",
      },
    ],
  },
  {
    id: "life-coaching",
    title: "Life Coaching",
    subtitle: "Inspire action with powerful slides",
    displayCount: "124",
    templates: [
      {
        id: "coach-affirmation",
        title: "Daily Affirmation",
        category: "life-coaching",
        previewImage: img("photo-1506126613408-eca07ce68773"),
        overlayLabel: "Daily Affirmation",
        slideCount: 6,
        creatorName: "Mindful Co",
        creatorAvatar: avatar("photo-1580489944761-15a19d654956"),
        badge: "AI MAGIC",
        prompt:
          "Life coaching affirmation slide: Calming, uplifting headline like 'You are capable of more than you know.' Soft gradient background, serene mood. Minimal, centered typography.",
      },
      {
        id: "coach-framework",
        title: "Simple Framework",
        category: "life-coaching",
        previewImage: img("photo-1544367567-0f2fcb009e0b"),
        overlayLabel: "Simple Framework",
        slideCount: 8,
        creatorName: "Coach Kit",
        creatorAvatar: avatar("photo-1573496359142-b8d87734a5a2"),
        isNew: true,
        prompt:
          "Coaching framework slide: 3-step method (Step 1, 2, 3) with short labels. Empowering tone. Warm palette, clear hierarchy, room to breathe.",
      },
      {
        id: "coach-question",
        title: "Reflection Question",
        category: "life-coaching",
        previewImage: img("photo-1499203693690-9a9a5a48a1b5"),
        overlayLabel: "Reflection",
        slideCount: 5,
        creatorName: "Inner Glow",
        creatorAvatar: avatar("photo-1531123897727-8f129e6888cf"),
        prompt:
          "Reflection question slide: One powerful question that makes the reader pause. Subtle 'journal this' callout. Soft, introspective aesthetic.",
      },
      {
        id: "coach-story",
        title: "Client Win",
        category: "life-coaching",
        previewImage: img("photo-1573497019940-1c28c88b4f3e"),
        thumbnailImage: img("photo-1573496359142-b8d87734a5a2"),
        overlayLabel: "Client Win",
        slideCount: 9,
        creatorName: "Rise Studio",
        creatorAvatar: avatar("photo-1560250097-0b93528c311a"),
        badge: "AI MAGIC",
        prompt:
          "Client success story slide: 'She went from stuck to thriving in 90 days.' Short proof line. Trust-building, human-centered layout with photo space.",
      },
    ],
  },
  {
    id: "sales",
    title: "To Get More Sales",
    subtitle: "Convert followers into customers",
    displayCount: "2K+",
    templates: [
      {
        id: "sales-pain",
        title: "Pain Point",
        category: "sales",
        previewImage: img("photo-1441986300917-64674bd600d8"),
        overlayLabel: "Product Listing",
        slideCount: 10,
        creatorName: "Kittl",
        creatorAvatar: avatar("photo-1611162617474-5b21e879e113"),
        badge: "AI MAGIC",
        prompt:
          "Sales pain-point slide: Hook that names the reader's frustration. 'Tired of [problem]?' Subtitle teases the solution. Bold, direct copy. Strong CTA chip 'Swipe →'.",
      },
      {
        id: "sales-offer",
        title: "Offer Reveal",
        category: "sales",
        previewImage: img("photo-1523275335684-37898b6baf30"),
        overlayLabel: "Offer Reveal",
        slideCount: 7,
        creatorName: "Fast Ink",
        creatorAvatar: avatar("photo-1534528741775-53994a69daeb"),
        isNew: true,
        prompt:
          "Offer reveal slide: Product or service headline with key benefit. Price or value prop line. Urgent but not spammy. Accent CTA button 'Get started'.",
      },
      {
        id: "sales-social-proof",
        title: "Results Proof",
        category: "sales",
        previewImage: img("photo-1553062407-98eeb64c6a62"),
        overlayLabel: "Social Proof",
        slideCount: 8,
        creatorName: "Proof Lab",
        creatorAvatar: avatar("photo-1507003211169-0a1dd7228f2d"),
        prompt:
          "Social proof sales slide: '500+ clients served' or similar metric. One testimonial snippet. Credible, clean layout with star or check accent.",
      },
      {
        id: "sales-objection",
        title: "Myth Buster",
        category: "sales",
        previewImage: img("photo-1556821840-3a63f95609a7"),
        overlayLabel: "Myth Buster",
        slideCount: 6,
        creatorName: "Close Co",
        creatorAvatar: avatar("photo-1472099645785-5658abf4ff4e"),
        badge: "AI MAGIC",
        prompt:
          "Objection-handling slide: 'Think you can't afford it?' Myth vs reality layout. Reassuring copy, confident tone. CTA to learn more.",
      },
    ],
  },
  {
    id: "trust",
    title: "Trust Building",
    subtitle: "Build credibility and social proof",
    displayCount: "86",
    templates: [
      {
        id: "trust-testimonial",
        title: "Testimonial",
        category: "trust",
        previewImage: img("photo-1522075469751-3a6694fb2f61"),
        thumbnailImage: img("photo-1560250097-0b93528c311a"),
        overlayLabel: "Testimonial",
        slideCount: 5,
        creatorName: "Trust Studio",
        creatorAvatar: avatar("photo-1560250097-0b93528c311a"),
        badge: "AI MAGIC",
        prompt:
          "Testimonial trust slide: Client quote in large type. Name and role attribution. Clean, professional layout. Subtle quote marks accent.",
      },
      {
        id: "trust-about",
        title: "About Me",
        category: "trust",
        previewImage: img("photo-1573496359142-b8d87734a5a2"),
        overlayLabel: "About Me",
        slideCount: 7,
        creatorName: "Brand You",
        creatorAvatar: avatar("photo-1573496359142-b8d87734a5a2"),
        prompt:
          "About me trust slide: 'Hi, I'm [name]' intro headline. 2-line credibility statement. Warm, approachable photo placement area. Personal brand feel.",
      },
      {
        id: "trust-credentials",
        title: "Credentials",
        category: "trust",
        previewImage: img("photo-1454165804606-c3d57bc86b40"),
        overlayLabel: "Credentials",
        slideCount: 6,
        creatorName: "Cred Builder",
        creatorAvatar: avatar("photo-1519085360753-af0119f7cbe7"),
        isNew: true,
        prompt:
          "Credentials slide: 'Why trust me?' headline. 3 bullet credentials (years experience, certifications, results). Authoritative but approachable.",
      },
      {
        id: "trust-process",
        title: "How It Works",
        category: "trust",
        previewImage: img("photo-1552664730-d307ca884978"),
        overlayLabel: "How It Works",
        slideCount: 8,
        creatorName: "Process Pro",
        creatorAvatar: avatar("photo-1506794778202-cad84cf45f1d"),
        badge: "AI MAGIC",
        prompt:
          "Process transparency slide: 'How we work together' — 3 simple steps. Reduces friction, builds confidence. Clear icons or numbers, friendly tone.",
      },
    ],
  },
];

export function findTemplate(id: string): CarouselTemplate | undefined {
  for (const category of TEMPLATE_CATEGORIES) {
    const found = category.templates.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}
