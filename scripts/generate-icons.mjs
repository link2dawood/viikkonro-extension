// Rasterizes the brand mark into every icon the manifest and stores need
// (FR-10.6). The mark is the site's favicon.svg: shapes only, no text, so the
// logo's font-fallback problem can't carry over. Output is committed.
//
// - 16 and 32 px come from pixel-aligned redraws (src/assets/icons), rendered
//   at native size, so the toolbar icon stays sharp instead of blurring the
//   64-unit master's fractional edges.
// - 128 px follows the Chrome Web Store rule: 96×96 artwork centred on a
//   128×128 transparent canvas. The same file is the store icon.
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file));
const master = read("src/assets/brand-mark.svg");
const MASTER_UNITS = 64;

const targets = [
  { out: "public/icon/16.png", svg: read("src/assets/icons/brand-mark-16.svg"), art: 16, native: true },
  { out: "public/icon/32.png", svg: read("src/assets/icons/brand-mark-32.svg"), art: 32, native: true },
  { out: "public/icon/48.png", svg: master, art: 48 },
  { out: "public/icon/96.png", svg: master, art: 96 },
  { out: "public/icon/128.png", svg: master, art: 96, padding: 16 },
  // Edge Add-ons store logo (300×300 recommended).
  { out: "store/edge-logo-300x300.png", svg: master, art: 256, padding: 22 },
  // Chrome Web Store / AMO store icon: the same padded 128 as the manifest.
  { out: "store/icon-128x128.png", svg: master, art: 96, padding: 16 },
];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

for (const { out, svg, art, native = false, padding = 0 } of targets) {
  // Native SVGs render 1:1; the master renders 4× oversize, then downsamples.
  const density = native ? 72 : Math.ceil((72 * art * 4) / MASTER_UNITS);
  let image = sharp(svg, { density }).resize(art, art);
  if (padding) {
    image = sharp(await image.png().toBuffer()).extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: transparent,
    });
  }
  const file = path.join(root, out);
  mkdirSync(path.dirname(file), { recursive: true });
  await image.png({ compressionLevel: 9 }).toFile(file);
  console.log(`${out} (${art + padding * 2}px)`);
}
