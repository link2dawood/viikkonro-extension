/* global document */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

// Brand artwork, not simulated product UI: the existing mark, an example week
// number, and the extension's signature 53-week comb. Minimal bilingual copy
// lets the same promotional assets work alongside either localized listing.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "store/chrome");
const uri = async (file, mime) => `data:${mime};base64,${(await readFile(path.join(root, file))).toString("base64")}`;
const [font, mono, mark] = await Promise.all([
  uri("src/assets/fonts/bricolage-grotesque-variable-latin.woff2", "font/woff2"),
  uri("src/assets/fonts/ibm-plex-mono-400-latin.woff2", "font/woff2"),
  uri("src/assets/brand-mark.svg", "image/svg+xml"),
]);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  for (const [name, width, height] of [["promo-small-440x280", 440, 280], ["promo-marquee-1400x560", 1400, 560]]) {
    const small = width === 440;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const comb = Array.from({ length: 53 }, (_, i) => `<i class="${i < 36 ? "past" : i === 36 ? "now" : "future"}"></i>`).join("");
    await page.setContent(`<!doctype html><html lang="fi"><head><meta charset="utf-8"><style>
      @font-face{font-family:Display;src:url('${font}');font-weight:200 800}
      @font-face{font-family:Mono;src:url('${mono}');font-weight:400}
      *{box-sizing:border-box}body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#123f2e;color:#f0f6f3;font-family:Display,sans-serif;-webkit-font-smoothing:antialiased}
      .brand{position:absolute;display:flex;align-items:center;font-weight:800;letter-spacing:-.04em;line-height:1;white-space:nowrap}
      .brand img{display:block;flex:none;box-shadow:0 0 0 1px #ffffff18;border-radius:24%}
      .week{position:absolute;display:flex;flex-direction:column;align-items:center}
      .label{font:400 14px Mono;letter-spacing:.2em;color:#96c4b4}
      .number{font-weight:800;line-height:.85;letter-spacing:-.06em}
      .comb{position:absolute;display:flex;align-items:flex-end;gap:${small ? 3 : 9}px}
      .comb i{flex:1;border-radius:3px;background:#ffffff1f;height:28%}.comb .past{background:#96c4b4;height:56%}.comb .now{background:#e0a23b;height:100%}
      .url{position:absolute;font:400 16px Mono;color:#96c4b4;letter-spacing:.02em}
      ${small ? `
        .brand{left:26px;top:24px;font-size:33px;gap:12px}.brand img{width:38px;height:38px}
        .week{left:198px;top:93px;width:210px}.number{font-size:142px}.label{position:absolute;right:252px;top:36px;width:120px;font-size:12px;line-height:1.9;letter-spacing:.18em}
        .comb{left:26px;right:26px;bottom:23px;height:38px}
      ` : `
        .brand{left:72px;top:161px;font-size:100px;gap:26px}.brand img{width:104px;height:104px}
        .week{right:84px;top:81px;width:342px;gap:32px}.label{font-size:17px}.number{font-size:280px}
        .comb{left:72px;right:72px;bottom:62px;height:72px}.url{left:76px;top:298px}
      `}
    </style></head><body><div class="brand"><img src="${mark}" alt="">Viikko Nro</div><div class="week"><div class="label">${small ? "VIIKKO<br>WEEK" : "VIIKKO / WEEK"}</div><div class="number">37</div></div>${small ? "" : '<div class="url">viikkonro.fi</div>'}<div class="comb">${comb}</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".brand img").evaluate((img) => img.decode());
    const png = await page.screenshot();
    const file = path.join(output, `${name}.png`);
    await sharp(png).resize(width, height).flatten({ background: "#123f2e" }).removeAlpha().png({ palette: false }).toFile(file);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    assert.equal(metadata.channels, 3);
    assert.equal(metadata.hasAlpha, false);
    assert.equal(metadata.depth, "uchar");
    console.log(`${path.relative(root, file)} — ${width}×${height}, 24-bit RGB PNG, no alpha`);
    await page.close();
  }
} finally {
  await browser.close();
}
