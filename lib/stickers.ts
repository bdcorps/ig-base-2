/**
 * Built-in sticker library shown in the design workspace's asset rail.
 * Each sticker is a static SVG served from /public/stickers. Clicking one adds
 * an image element to the canvas (with fit "contain") that references the SVG url.
 */

export interface StickerAsset {
  id: string;
  label: string;
  src: string;
}

export const STICKERS: StickerAsset[] = [
  { id: "star", label: "Star", src: "/stickers/star.svg" },
  { id: "heart", label: "Heart", src: "/stickers/heart.svg" },
  { id: "sparkle", label: "Sparkle", src: "/stickers/sparkle.svg" },
  { id: "bolt", label: "Bolt", src: "/stickers/bolt.svg" },
  { id: "sun", label: "Sun", src: "/stickers/sun.svg" },
  { id: "smiley", label: "Smiley", src: "/stickers/smiley.svg" },
  { id: "fire", label: "Fire", src: "/stickers/fire.svg" },
  { id: "cloud", label: "Cloud", src: "/stickers/cloud.svg" },
  { id: "flower", label: "Flower", src: "/stickers/flower.svg" },
  { id: "check-badge", label: "Verified", src: "/stickers/check-badge.svg" },
  { id: "speech-bubble", label: "Speech", src: "/stickers/speech-bubble.svg" },
  { id: "arrow", label: "Arrow", src: "/stickers/arrow.svg" },
  { id: "rainbow", label: "Rainbow", src: "/stickers/rainbow.svg" },
];
