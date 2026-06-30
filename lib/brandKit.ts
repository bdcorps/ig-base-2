import { GOOGLE_FONTS } from "@/lib/fonts";

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  isMain: boolean;
}

export interface AuthorPhoto {
  id: string;
  url: string;
}

export interface BrandKit {
  colors: BrandColor[];
  headingFont: string;
  bodyFont: string;
  authorPhotos: AuthorPhoto[];
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  colors: [
    { id: "main", name: "Primary", hex: "#1f2a44", isMain: true },
    { id: "accent", name: "Accent", hex: "#e8743b", isMain: false },
    { id: "bg", name: "Background", hex: "#f4f1ea", isMain: false },
  ],
  headingFont: "Archivo Black",
  bodyFont: "Inter",
  authorPhotos: [],
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isFont(value: unknown): value is string {
  return typeof value === "string" && (GOOGLE_FONTS as readonly string[]).includes(value);
}

/** Coerce an arbitrary JSON value (from the DB) into a valid BrandKit. */
export function normalizeBrandKit(raw: unknown): BrandKit {
  if (!raw || typeof raw !== "object") return DEFAULT_BRAND_KIT;
  const obj = raw as Record<string, unknown>;

  const colors = Array.isArray(obj.colors)
    ? (obj.colors as unknown[])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c, i) => ({
          id: typeof c.id === "string" ? c.id : `color-${i}`,
          name: typeof c.name === "string" ? c.name : `Color ${i + 1}`,
          hex: typeof c.hex === "string" && HEX_RE.test(c.hex) ? c.hex : "#000000",
          isMain: c.isMain === true,
        }))
    : DEFAULT_BRAND_KIT.colors;

  const authorPhotos = Array.isArray(obj.authorPhotos)
    ? (obj.authorPhotos as unknown[])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .filter((p) => typeof p.url === "string")
        .map((p, i) => ({
          id: typeof p.id === "string" ? p.id : `photo-${i}`,
          url: p.url as string,
        }))
    : [];

  const ensuredColors = colors.length > 0 ? colors : DEFAULT_BRAND_KIT.colors;
  if (!ensuredColors.some((c) => c.isMain)) ensuredColors[0].isMain = true;

  return {
    colors: ensuredColors,
    headingFont: isFont(obj.headingFont) ? obj.headingFont : DEFAULT_BRAND_KIT.headingFont,
    bodyFont: isFont(obj.bodyFont) ? obj.bodyFont : DEFAULT_BRAND_KIT.bodyFont,
    authorPhotos,
  };
}
