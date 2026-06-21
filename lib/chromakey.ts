import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/** Convert RGB (0-255) to HSV (h: 0-360, s/v: 0-100). */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / delta + 2) / 6;
    else h = ((rn - gn) / delta + 4) / 6;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return [h * 360, s, v];
}

/** True when a pixel looks like chromakey green (#00FF00 and nearby shades). */
function isChromakeyGreen(r: number, g: number, b: number): boolean {
  if (g > 180 && g > r * 1.35 && g > b * 1.35) return true;

  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 75 && h <= 165 && s >= 25 && v >= 20;
}

function decodeImage(input: Buffer): { pixels: Uint8Array; width: number; height: number } {
  try {
    const png = PNG.sync.read(input);
    return { pixels: png.data, width: png.width, height: png.height };
  } catch {
    const decoded = jpeg.decode(input, { useTArray: true });
    return {
      pixels: decoded.data,
      width: decoded.width,
      height: decoded.height,
    };
  }
}

function encodePng(
  pixels: Uint8Array,
  width: number,
  height: number,
): Buffer {
  const png = new PNG({ width, height });
  png.data = Buffer.from(pixels);
  return PNG.sync.write(png);
}

/**
 * Strip a chromakey-green background and return a transparent PNG data URL.
 */
export async function removeChromakey(dataUrl: string): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const input = Buffer.from(base64, "base64");
  const { pixels, width, height } = decodeImage(input);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;

    if (isChromakeyGreen(r, g, b)) {
      pixels[i + 3] = 0;
    } else {
      const greenness = g / Math.max(r, b, 1);
      if (greenness > 1.15 && g > 120) {
        pixels[i + 3] = Math.round(pixels[i + 3]! * Math.max(0, 1.6 - greenness));
      }
    }
  }

  const output = encodePng(pixels, width, height);
  return `data:image/png;base64,${output.toString("base64")}`;
}
