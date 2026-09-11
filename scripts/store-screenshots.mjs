/* global document */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

// Visual thesis: quiet paper, forest green, generous type, and the real product.
// Content: current week → week browsing → personal settings. Static exports;
// reduced motion keeps the app's week-comb animation out of the captures.
const root = fileURLToPath(new URL("../", import.meta.url));
const extensionPath = path.join(root, ".output/chrome-mv3");
const output = path.join(root, "store/screenshots");
const profile = await mkdtemp(path.join(tmpdir(), "viikkonro-screenshots-"));
const dataUri = async (file, type) => `data:${type};base64,${(await readFile(path.join(root, file))).toString("base64")}`;
const [displayFont, uiFont, mark] = await Promise.all([
  dataUri("src/assets/fonts/bricolage-grotesque-variable-latin.woff2", "font/woff2"),
  dataUri("src/assets/fonts/inter-variable-latin.woff2", "font/woff2"),
  dataUri("src/assets/brand-mark.svg", "image/svg+xml"),
]);
const copy = {
  fi: [
    ["Viikko yhdellä\nsilmäyksellä.", "Kuluvan viikon numero, päivämäärät ja seuraava koululoma samassa näkymässä.", "VIIKKONUMERO", "NYKYINEN VIIKKO"],
    ["Katse tuleviin\nviikkoihin.", "Selaa viikkoja nuolilla. Näet päivämäärät ja palaat tähän viikkoon yhdellä painalluksella.", "VIIKKOJEN SELAUS", "VALITTU VIIKKO"],
    ["Oma kaupunki.\nOma tapa.", "Valitse koululomien kaupunki, kuvakkeen merkintä ja käyttöliittymän kieli.", "OMAT ASETUKSET", "ASETUKSET"],
  ],
  en: [
    ["Your week,\nat a glance.", "The current week number, its dates and your next school holiday in one view.", "WEEK NUMBER", "CURRENT WEEK"],
    ["Look ahead.\nWeek by week.", "Browse weeks with the arrows. See their dates and return to this week in one click.", "BROWSE WEEKS", "SELECTED WEEK"],
    ["Your city.\nYour way.", "Choose your school holiday city, toolbar badge format and interface language.", "YOUR PREFERENCES", "SETTINGS"],
  ],
};
const names = ["01-current-week", "02-browse-weeks", "03-settings"];
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    timezoneId: "Europe/Helsinki",
    reducedMotion: "reduce",
  });
  // The install event opens the website. Captures use bundled extension files only.
  await context.route(/^https?:/, (route) => route.abort());
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).hostname;
  const app = await context.newPage();
  const errors = [];
  app.on("pageerror", (error) => errors.push(error.message));
  await app.clock.setFixedTime(new Date("2026-09-11T12:00:00+03:00"));
  const canvas = await context.newPage();
  const previews = [];
  for (const lang of ["fi", "en"]) {
    await mkdir(path.join(output, lang), { recursive: true });
    await worker.evaluate(async (language) => {
      await globalThis.chrome.storage.local.remove("settings");
      await globalThis.chrome.storage.sync.set({ settings: { city: "Helsinki", badgeFormat: "number", language } });
    }, lang);
    for (let index = 0; index < 3; index++) {
      await app.goto(`chrome-extension://${id}/${index === 2 ? "options" : "popup"}.html`);
      await app.locator(index === 2 ? ".options" : ".popup").waitFor();
      await app.waitForFunction((expected) => document.documentElement.lang === expected, lang);
      await app.evaluate(() => document.fonts.ready);
      if (index === 1) {
        for (let step = 0; step < 5; step++) await app.getByRole("button", { name: lang === "fi" ? "Seuraava viikko" : "Next week", exact: true }).click();
        await app.locator(".week-big .num").filter({ hasText: "42" }).waitFor();
      }
      await app.mouse.move(0, 0);
      let capture;
      if (index === 2) {
        // A real settings interaction keeps the city picker focused and legible.
        await app.getByRole("searchbox").fill("Helsinki");
        const first = await app.locator(".opt-section").nth(0).boundingBox();
        const last = await app.locator(".opt-section").nth(2).boundingBox();
        capture = await app.screenshot({ clip: { x: first.x - 12, y: first.y - 12, width: first.width + 24, height: last.y + last.height - first.y + 24 }, animations: "disabled" });
      } else {
        capture = await app.locator("body").screenshot({ animations: "disabled" });
      }
      const metadata = await sharp(capture).metadata();
      const maxWidth = index === 2 ? 590 : 468;
      const scale = Math.min(maxWidth / metadata.width, 610 / metadata.height);
      const width = Math.round(metadata.width * scale);
      const height = Math.round(metadata.height * scale);
      const [headline, body, eyebrow, caption] = copy[lang][index];
      await canvas.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
        @font-face{font-family:Display;src:url('${displayFont}');font-weight:200 800}
        @font-face{font-family:Inter;src:url('${uiFont}');font-weight:100 900}
        *{box-sizing:border-box}body{margin:0;width:1280px;height:800px;background:#e7eceb;color:#15211f;font-family:Inter,sans-serif}
        .brand{position:absolute;left:64px;top:48px;display:flex;align-items:center;gap:14px;font:800 43px Display;letter-spacing:-1.6px}.brand img{width:43px;height:43px}
        .series{position:absolute;right:64px;top:65px;font-size:12px;letter-spacing:2px;color:#56655f}
        .copy{position:absolute;left:64px;top:252px;width:485px}.eyebrow{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:650;letter-spacing:2.3px;color:#16573f}.eyebrow:before{content:'';width:28px;height:2px;background:#1f7a5c}
        h1{font:800 62px/1.06 Display;letter-spacing:-2.6px;margin:24px 0}.description{font-size:20px;line-height:1.65;color:#56655f;max-width:420px;margin:0}
        .product{position:absolute;left:588px;top:140px;width:628px;height:610px;display:flex;align-items:center;justify-content:center}
        .capture{display:block;width:${width}px;height:${height}px;box-shadow:0 18px 42px rgba(21,33,31,.12);border:1px solid rgba(21,33,31,.14);border-radius:14px}
        .caption{position:absolute;top:112px;left:588px;width:628px;text-align:center;font-size:11px;letter-spacing:2px;color:#56655f}
        footer{position:absolute;left:64px;bottom:46px;font-size:14px;font-weight:600;color:#16573f}
      </style></head><body><div class="brand"><img src="${mark}" alt="">Viikko Nro</div><div class="series">${String(index + 1).padStart(2, "0")} / 03</div><div class="copy"><div class="eyebrow">${eyebrow}</div><h1>${headline.replaceAll("\n", "<br>")}</h1><p class="description">${body}</p></div><div class="caption">${caption}</div><div class="product"><img class="capture" src="data:image/png;base64,${capture.toString("base64")}" alt="${caption}"></div><footer>viikkonro.fi</footer></body></html>`);
      await canvas.evaluate(() => document.fonts.ready);
      await canvas.locator(".capture").evaluate((img) => img.decode());
      const rendered = await canvas.screenshot({ animations: "disabled" });
      const file = path.join(output, lang, `${names[index]}.png`);
      await sharp(rendered).resize(1280, 800).flatten({ background: "#e7eceb" }).removeAlpha().png({ palette: false }).toFile(file);
      const result = await sharp(file).metadata();
      assert.equal(result.width, 1280);
      assert.equal(result.height, 800);
      assert.equal(result.channels, 3);
      assert.equal(result.hasAlpha, false);
      assert.equal(result.depth, "uchar");
      previews.push({ input: await sharp(file).resize(640, 400).toBuffer(), left: index * 640, top: lang === "fi" ? 0 : 400 });
      console.log(`${path.relative(root, file)} — 1280×800, RGB PNG, no alpha`);
    }
  }
  assert.deepEqual(errors, [], "Extension pages must render without JavaScript errors");
  await sharp({ create: { width: 1920, height: 800, channels: 3, background: "#e7eceb" } }).composite(previews).jpeg({ quality: 90 }).toFile(path.join(output, "preview.jpg"));
  await writeFile(path.join(output, "README.md"), `# Localized store screenshots\n\nUpload the three PNGs in fi/ to the Finnish listing and the three PNGs in en/ to the English listing. Each is 1280 × 800, 8 bits per channel RGB (24-bit PNG), without alpha. preview.jpg is a contact sheet only; do not upload it.\n\n01: Current week with Helsinki school holidays.\n02: Week 42 selected using the popup arrows.\n03: Settings with Helsinki entered in the city search.\n\nCaptures use the production extension in Chromium, its real settings and UI, and a fixed example date of 11 September 2026 in Europe/Helsinki. The interface is cropped/scaled for presentation; product markup and styles are unchanged.\n\nRegenerate with:\n\n\u0060\u0060\u0060sh\npnpm build\nnode scripts/store-screenshots.mjs\n\u0060\u0060\u0060\n\nRequires the Playwright Chromium browser (pnpm exec playwright install chromium).\n`);
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
