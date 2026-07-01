import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/schema";
import { toPng } from "html-to-image";
import JSZip from "jszip";

/** Capture slide DOM nodes at full canvas resolution as PNG data URLs. */
export async function captureSlidesAsDataUrls(
  slideRoots: HTMLElement[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const root of slideRoots) {
    const dataUrl = await toPng(root, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
    });
    urls.push(dataUrl);
  }
  return urls;
}

/** Capture slide DOM nodes at full canvas resolution and download as a ZIP of PNGs. */
export async function downloadSlidesAsZip(
  slideRoots: HTMLElement[],
  filename = "carousel-slides.zip",
): Promise<void> {
  if (slideRoots.length === 0) return;

  const zip = new JSZip();

  for (let i = 0; i < slideRoots.length; i++) {
    const dataUrl = await toPng(slideRoots[i], {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
    });
    const base64 = dataUrl.split(",")[1];
    if (!base64) continue;
    zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
