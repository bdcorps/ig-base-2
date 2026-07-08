import type { Palette, Theme } from "@/lib/schema";

/**
 * Curated Google fonts offered in the UI, grouped by use-case. Each family is
 * loaded at runtime by injecting a <link> to fonts.googleapis.com (see
 * Controls/SettingsScreen), so adding to this list requires no build step.
 * A family is listed once, under the first category that fits it.
 */
export const FONT_CATEGORIES: { label: string; fonts: string[] }[] = [
  {
    label: "Clean & Modern Sans",
    fonts: ["Poppins", "Montserrat", "Inter", "Manrope", "Plus Jakarta Sans", "Instrument Sans", "Outfit", "Urbanist", "DM Sans", "Hanken Grotesk", "Albert Sans", "Onest", "Public Sans", "Figtree", "Be Vietnam Pro", "Sora", "Archivo", "Work Sans", "Assistant", "Asap", "Asap Condensed", "IBM Plex Sans", "IBM Plex Sans Condensed", "Noto Sans", "Noto Sans Display", "Mulish", "Cabin", "Cabin Condensed", "Karla", "Maven Pro", "M PLUS Rounded 1c", "M PLUS 1", "M PLUS 2", "Monda", "Hind", "Hind Madurai", "Hind Siliguri", "Hind Vadodara", "Hind Guntur", "Heebo", "Commissioner", "Overpass", "Overpass Mono", "Encode Sans", "Encode Sans Condensed", "Encode Sans Expanded", "Red Hat Display", "Red Hat Text", "Epilogue", "Exo 2", "Gabarito", "Lexend", "Rubik", "Schibsted Grotesk", "Signika", "Signika Negative", "Telex", "Titillium Web", "Ubuntu", "Varta"],
  },
  {
    label: "Geometric / Startup",
    fonts: ["Space Grotesk", "Syne", "Bricolage Grotesque", "League Spartan", "Archivo Narrow", "Chivo", "Chivo Mono", "Kanit", "Prompt", "Saira", "Saira Condensed", "Saira Semi Condensed", "Saira Extra Condensed", "Rajdhani", "Teko", "Khand", "Orbitron", "Michroma", "Quantico", "Aldrich", "Audiowide", "Bruno Ace", "Bruno Ace SC", "Chakra Petch", "Jura", "Oxanium", "Tomorrow", "Unbounded"],
  },
  {
    label: "Editorial Serif",
    fonts: ["Instrument Serif", "Newsreader", "Fraunces", "DM Serif Display", "Cormorant Garamond", "Cormorant", "Cormorant Infant", "Cormorant SC", "Cormorant Upright", "Libre Bodoni", "Prata", "Playfair Display", "Lora", "Crimson Pro", "EB Garamond", "Spectral", "Spectral SC", "Petrona", "Literata", "Arapey", "Gilda Display", "Bodoni Moda", "Bellefair", "Cardo", "Sorts Mill Goudy", "Rosarivo", "Vidaloka", "Domine", "Vollkorn", "Vollkorn SC", "Libre Baskerville", "Bree Serif", "Cormorant Unicase", "Fanwood Text", "Trirong", "Tienne", "Alegreya", "Alegreya SC", "Alegreya Sans SC", "Neuton"],
  },
  {
    label: "Fashion / Luxury",
    fonts: ["Cinzel", "Cinzel Decorative", "Forum", "Marcellus", "Marcellus SC", "Oranienbaum", "Tenor Sans", "Poiret One"],
  },
  {
    label: "Friendly & Lifestyle",
    fonts: ["Nunito", "Nunito Sans", "Quicksand", "Comfortaa", "Varela Round", "Baloo 2", "Baloo Bhai 2", "Baloo Chettan 2", "Baloo Da 2", "Baloo Paaji 2", "Fredoka", "Dosis", "Raleway", "Catamaran", "Questrial", "Jost", "Righteous"],
  },
  {
    label: "High Impact Headlines",
    fonts: ["Anton", "Bebas Neue", "Archivo Black", "Oswald", "Fjalla One", "Russo One", "Alfa Slab One", "Bungee", "Bungee Inline", "Bungee Shade", "Black Ops One", "Staatliches", "Bowlby One", "Bowlby One SC", "Rammetto One", "Paytone One", "Lilita One", "Ultra", "Passion One", "Changa One", "Luckiest Guy"],
  },
  {
    label: "Creative / Agency",
    fonts: ["Rubik Glitch", "Monoton", "Megrim", "Syncopate", "Silkscreen", "Press Start 2P", "VT323", "Rubik Pixels", "DotGothic16", "Zen Dots", "Zen Tokyo Zoo", "Iceland", "Monomaniac One"],
  },
  {
    label: "Script / Handwritten",
    fonts: ["Caveat", "Kalam", "Pacifico", "Sacramento", "Satisfy", "Great Vibes", "Allura", "Dancing Script", "Parisienne", "Yellowtail", "Kaushan Script", "Courgette", "Cookie", "Merienda", "Marck Script", "Shadows Into Light", "Indie Flower", "Gloria Hallelujah", "Patrick Hand", "Permanent Marker", "Rock Salt", "Reenie Beanie", "Handlee", "Covered By Your Grace", "Nothing You Could Do"],
  },
  {
    label: "Monospace",
    fonts: ["IBM Plex Mono", "Space Mono", "JetBrains Mono", "Roboto Mono", "Ubuntu Mono", "Inconsolata", "Anonymous Pro", "Source Code Pro", "Fira Mono", "PT Mono", "Cousine", "Share Tech Mono", "Victor Mono", "Cutive Mono"],
  },
  {
    label: "Vintage / Retro",
    fonts: ["Special Elite", "Rye", "Ewert", "Sancreek", "Fredericka the Great", "Limelight", "Fascinate", "Fascinate Inline", "Abril Fatface", "Yeseva One", "Playball", "UnifrakturCook", "IM Fell English", "IM Fell French Canon", "IM Fell DW Pica", "IM Fell Double Pica", "Alice"],
  },
  {
    label: "Condensed",
    fonts: ["Roboto Condensed", "Barlow Condensed", "Barlow Semi Condensed", "Antonio", "Exo"],
  },
];

/** Flat, de-duplicated list of every offered family (derived from categories). */
export const GOOGLE_FONTS: string[] = Array.from(
  new Set(FONT_CATEGORIES.flatMap((c) => c.fonts)),
);

export type GoogleFont = string;

const DEFAULT_FONT_WEIGHTS = "400;500;600;700;800;900";

/**
 * Per-family weight axes. Most families render fine with the default discrete
 * weight list (the CSS2 API tolerates unavailable discrete weights), but for a
 * few single-weight display/handwriting fonts we request only what they ship to
 * avoid faux-bold synthesis.
 */
const FONT_WEIGHTS: Record<string, string> = {
  Caveat: "400;500;600;700",
  "Dancing Script": "400;500;600;700",
  Pacifico: "400",
  "Permanent Marker": "400",
  "Shadows Into Light": "400",
};

/** Build the fonts.googleapis.com URL for a set of families. */
export function googleFontsHref(families: string[]): string {
  const unique = Array.from(new Set(families));
  const params = unique
    .map((f) => {
      const weights = FONT_WEIGHTS[f as GoogleFont] ?? DEFAULT_FONT_WEIGHTS;
      return `family=${encodeURIComponent(f)}:wght@${weights}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Preset palettes distilled from the /samples looks. */
export const PRESET_PALETTES: { name: string; palette: Palette }[] = [
  {
    name: "Soft Blue",
    palette: { background: "#9db4d8", text: "#1f2a44", accent: "#e8743b", secondary: "#5a74a6", neutral: "#6f7f9e" },
  },
  {
    name: "Cream Editorial",
    palette: { background: "#f4f1ea", text: "#211d17", accent: "#c2603a", secondary: "#e0a58a", neutral: "#b8ad9c" },
  },
  {
    name: "Bold Dark",
    palette: { background: "#0e0e0e", text: "#ffffff", accent: "#f0654a", secondary: "#f0a08f", neutral: "#5c5c5c" },
  },
  {
    name: "Mint Fresh",
    palette: { background: "#0f5e4e", text: "#f3fff8", accent: "#ffd166", secondary: "#5fbf94", neutral: "#4a7a68" },
  },
];

export const DEFAULT_THEME: Theme = {
  palette: PRESET_PALETTES[0].palette,
  fonts: { heading: "Archivo Black", body: "Inter" },
};
