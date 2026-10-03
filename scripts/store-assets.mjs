// Store graphics at the exact sizes the Chrome Web Store, Microsoft Edge
// Add-ons and Firefox Add-ons ask for, in Finnish, English and Swedish:
//
//   store/<lang>/promo-small-440x280.png         CWS small promo tile / Edge small tile
//   store/<lang>/promo-marquee-1400x560.png      CWS marquee / Edge large tile
//   store/<lang>/screenshot-<n>-<name>.png       1280×800, all three stores
//
// The popup and options images are real captures of the built extension
// (.output/chrome-mv3), placed on the site's design. Everything is written as
// 24-bit PNG without alpha, which the Chrome Web Store requires.
//
//   pnpm store:assets     (builds first; needs Node 22.18+ for the .ts imports)
/* global chrome, document */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { formatDateRange } from "../src/lib/format.ts";
import { getISOWeekRange, getWeekRef, getWeeksInISOYear, parseISODate } from "../src/lib/week.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = path.join(root, ".output/chrome-mv3");
const workDir = path.join(root, ".output/store-work");
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const fileUrl = (file) => pathToFileURL(file).href;

if (!existsSync(path.join(extensionDir, "manifest.json"))) {
  console.error("No Chrome build found. Run `pnpm build` first (or use `pnpm store:assets`).");
  process.exit(1);
}
mkdirSync(workDir, { recursive: true });

const LANGS = ["fi", "en", "sv"];
const dataset = readJson("src/data/generated/dataset.json");
const messages = Object.fromEntries(LANGS.map((lang) => [lang, readJson(`public/_locales/${lang}/messages.json`)]));

// A fixed "today" so every run produces the same images: the first flag day
// on or after the data date, at 10:00, so the popup shows a flag-day row and
// a school-holiday countdown.
const showcaseDate = parseISODate(dataset.flagDays.find((day) => day.date >= dataset.generatedAt)?.date ?? dataset.generatedAt);
const now = new Date(showcaseDate.getFullYear(), showcaseDate.getMonth(), showcaseDate.getDate(), 10);
const currentWeek = getWeekRef(now);
const SHOWCASE_CITY = "Helsinki";
// The own-countdown row in screenshot 2: the next 1 June after the showcase date.
const COUNTDOWN_DATE = `${now.getFullYear() + 1}-06-01`;

const COPY = {
  fi: {
    tileHeadline: "Viikkonumero<br>aina näkyvissä",
    marqueeEyebrow: "Chrome · Edge · Firefox",
    marqueeHeadline: "Mikä viikko nyt on?<br>Näet sen aina.",
    marqueeSub: "Viikkonumero työkalupalkissa, työpäivät, pyhät, liputuspäivät ja oman kaupungin koululomat. Toimii ilman verkkoyhteyttä.",
    marqueeChips: ["ISO 8601", "Ei tietojen keruuta", "Suomi · Svenska · English"],
    countdownLabel: "Kesäloma",
    shots: [
      {
        id: "1-toolbar",
        eyebrow: "Työkalupalkki",
        title: "Viikkonumero aina näkyvissä",
        lead: "Kuluvan viikon numero näkyy kuvakkeessa ja vaihtuu itsestään. Pyhinä ja liputuspäivinä kuvake vaihtaa väriä.",
        points: ["Viikkonumerot ISO 8601 -standardin mukaan", "Viikon päivämäärät ja työpäivät", "Kopioi viikko yhdellä painalluksella"],
      },
      {
        id: "2-calendar",
        eyebrow: "Kalenteri",
        title: "Kuukausi, pyhät ja koululomat",
        lead: "Viikkonumerot päivien vieressä kuten paperikalenterissa. Pyhät, liputuspäivät ja koululomat on merkitty.",
        points: ["Päivät seuraavaan pyhään", "Oma laskuri esimerkiksi lomaan", "Koululomat 21 kaupungille"],
      },
      {
        id: "3-address-bar",
        eyebrow: "Osoiterivi",
        title: "Kirjoita vk 42",
        lead: "Anna viikko, päivämäärä, pyhän nimi tai päivämääräväli. Näet viikon, päivät ja työpäivät, ja Enter avaa viikon sivun.",
        examples: ["vk 42", "vk +3", "vk juhannus", "vk 24.12.", "vk 1.3.–15.6."],
      },
      {
        id: "4-settings",
        eyebrow: "Asetukset",
        title: "Ei tiliä. Ei tietojen keruuta.",
        lead: "Valitse kaupunki, kuvakkeen merkintä, kopioinnin muoto, kieli ja teema. Laajennus toimii kokonaan ilman verkkoyhteyttä.",
        points: ["Vain kaksi käyttöoikeutta", "Suomeksi, ruotsiksi ja englanniksi", "Chrome, Edge ja Firefox"],
      },
      {
        id: "5-dark",
        eyebrow: "Tumma teema",
        title: "Myös illalla",
        lead: "Tumma teema seuraa käyttöjärjestelmän asetusta, tai sen voi valita itse.",
        points: ["Vaalea, tumma tai järjestelmän mukaan", "Pikanäppäin Alt+Shift+W", "Sama ulkoasu kuin viikkonro.fi"],
      },
    ],
  },
  en: {
    tileHeadline: "Week number<br>always in view",
    marqueeEyebrow: "Chrome · Edge · Firefox",
    marqueeHeadline: "What week is it?<br>Always in view.",
    marqueeSub: "The ISO week number in your toolbar, plus working days, Finnish public holidays, flag days and school holidays. Works offline.",
    marqueeChips: ["ISO 8601", "No data collection", "Suomi · Svenska · English"],
    countdownLabel: "Summer holiday",
    shots: [
      {
        id: "1-toolbar",
        eyebrow: "Toolbar",
        title: "The week number, always in view",
        lead: "The current week number sits on the icon and changes by itself. On holidays and flag days the icon changes colour.",
        points: ["ISO 8601 week numbers", "The week's dates and working days", "Copy the week in one click"],
      },
      {
        id: "2-calendar",
        eyebrow: "Calendar",
        title: "The month, holidays and school breaks",
        lead: "Week numbers beside the days, like a paper calendar, with public holidays, flag days and school holidays marked.",
        points: ["Days to the next public holiday", "Your own countdown, e.g. to a holiday", "School holidays for 21 cities"],
      },
      {
        id: "3-address-bar",
        eyebrow: "Address bar",
        title: "Type vk 42",
        lead: "Enter a week, a date, a holiday name or a date range. See the week, the days and working days, and Enter opens the week's page.",
        examples: ["vk 42", "vk +3", "vk midsummer", "vk 24.12.", "vk 1.3.–15.6."],
      },
      {
        id: "4-settings",
        eyebrow: "Settings",
        title: "No account. No data collection.",
        lead: "Choose a city, the badge format, the copy format, the language and the theme. The extension works fully offline.",
        points: ["Only two permissions", "Finnish, Swedish and English", "Chrome, Edge and Firefox"],
      },
      {
        id: "5-dark",
        eyebrow: "Dark theme",
        title: "Easy on the eyes",
        lead: "The dark theme follows your system setting, or you can pick it yourself.",
        points: ["Light, dark or match system", "Keyboard shortcut Alt+Shift+W", "The same design as viikkonro.fi"],
      },
    ],
  },
  sv: {
    tileHeadline: "Veckonumret<br>alltid synligt",
    marqueeEyebrow: "Chrome · Edge · Firefox",
    marqueeHeadline: "Vilken vecka är det?<br>Alltid synligt.",
    marqueeSub: "Veckonumret i verktygsfältet, arbetsdagar, finländska helgdagar, flaggdagar och skollov i din stad. Fungerar offline.",
    marqueeChips: ["ISO 8601", "Ingen datainsamling", "Suomi · Svenska · English"],
    countdownLabel: "Sommarlov",
    shots: [
      {
        id: "1-toolbar",
        eyebrow: "Verktygsfältet",
        title: "Veckonumret alltid synligt",
        lead: "Veckans nummer syns på ikonen och byts av sig självt. På helgdagar och flaggdagar byter ikonen färg.",
        points: ["Veckonummer enligt ISO 8601", "Veckans datum och arbetsdagar", "Kopiera veckan med ett klick"],
      },
      {
        id: "2-calendar",
        eyebrow: "Kalender",
        title: "Månaden, helgdagar och skollov",
        lead: "Veckonummer bredvid dagarna, som i en papperskalender. Helgdagar, flaggdagar och skollov är markerade.",
        points: ["Dagar till nästa helgdag", "Egen nedräkning, till exempel till ett lov", "Skollov för 21 städer"],
      },
      {
        id: "3-address-bar",
        eyebrow: "Adressfältet",
        title: "Skriv vk 42",
        lead: "Ange en vecka, ett datum, en helgdag eller ett datumintervall. Du ser veckan, dagarna och arbetsdagarna, och Enter öppnar veckans sida.",
        examples: ["vk 42", "vk +3", "vk midsommar", "vk 24.12.", "vk 1.3.–15.6."],
      },
      {
        id: "4-settings",
        eyebrow: "Inställningar",
        title: "Inget konto. Ingen datainsamling.",
        lead: "Välj stad, ikonens märkning, kopieringsformat, språk och tema. Tillägget fungerar helt offline.",
        points: ["Bara två behörigheter", "På finska, svenska och engelska", "Chrome, Edge och Firefox"],
      },
      {
        id: "5-dark",
        eyebrow: "Mörkt tema",
        title: "Skonsamt för ögonen",
        lead: "Det mörka temat följer systemets inställning, eller så väljer du det själv.",
        points: ["Ljust, mörkt eller som systemet", "Kortkommandot Alt+Shift+W", "Samma utseende som viikkonro.fi"],
      },
    ],
  },
};

// ── Capture the real extension ────────────────────────────────────────────

const context = await chromium.launchPersistentContext("", {
  headless: true,
  channel: "chromium",
  args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  viewport: { width: 360, height: 900 },
  deviceScaleFactor: 2,
});
// Offline, like the extension itself (this also blocks the install tab's page).
await context.route(/^https?:\/\//, (route) => route.abort());
await context.clock.setFixedTime(now);

let worker = context.serviceWorkers()[0];
worker ??= await context.waitForEvent("serviceworker");
const extensionUrl = `chrome-extension://${new URL(worker.url()).host}`;
const page = await context.newPage();
const work = (name) => path.join(workDir, name);

async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function showPopup(settings, ready) {
  await page.evaluate((value) => chrome.storage.sync.set({ settings: value }), settings);
  await page.reload();
  await page.locator(ready).waitFor();
  await settle();
}

// A full-width slice of the popup from the top of `first` to the bottom of `last`.
async function popupSlice(first, last, file) {
  const top = await page.locator(first).boundingBox();
  const bottom = await page.locator(last).boundingBox();
  await page.screenshot({
    path: work(file),
    clip: { x: 0, y: top.y - 10, width: 360, height: bottom.y + bottom.height - top.y + 20 },
  });
}

for (const lang of LANGS) {
  const base = { city: SHOWCASE_CITY, badgeFormat: "number", language: lang };
  await page.setViewportSize({ width: 360, height: 1400 });
  await page.goto(`${extensionUrl}/popup.html`);
  await showPopup(base, ".holiday-row");
  await page.locator(".popup").screenshot({ path: work(`popup-${lang}.png`) });

  // The month view and the newer rows: next public holiday and an own countdown.
  const countdown = { date: COUNTDOWN_DATE, label: COPY[lang].countdownLabel };
  await showPopup({ ...base, showCalendar: true, countdown }, ".calendar");
  await popupSlice(".calendar", ".countdown", `calendar-${lang}.png`);

  await showPopup({ ...base, showCalendar: true, theme: "dark" }, ".calendar");
  await popupSlice(".hero-card", ".calendar", `dark-${lang}.png`);

  await page.setViewportSize({ width: 760, height: 1000 });
  await page.goto(`${extensionUrl}/options.html`);
  await page.locator(".options h1").waitFor();
  await settle();
  await page.screenshot({ path: work(`options-${lang}.png`), fullPage: true });
}

// ── Compose the store images ──────────────────────────────────────────────

const font = (file) => fileUrl(path.join(root, "src/assets/fonts", file));
const MARK = fileUrl(path.join(root, "src/assets/brand-mark.svg"));
const CHECK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.3 2.3 4.7-4.9' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

const BASE_CSS = `
@font-face { font-family: "Bricolage Grotesque"; font-weight: 200 800; src: url("${font("bricolage-grotesque-variable-latin.woff2")}") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 100 900; src: url("${font("inter-variable-latin.woff2")}") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("${font("ibm-plex-mono-500-latin.woff2")}") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 600; src: url("${font("ibm-plex-mono-600-latin.woff2")}") format("woff2"); }
:root { --paper: #e7eceb; --card: #f5f8f7; --ink: #15211f; --ink-soft: #56655f; --line: rgba(21,33,31,.12);
  --accent: #1f7a5c; --accent-deep: #16573f; --amber: #e0a23b; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { overflow: hidden; }
body { position: relative; font-family: "Inter", sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
.display { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; letter-spacing: -0.025em; line-height: 1.04; }
.paper { background: radial-gradient(900px 560px at 92% -8%, rgba(31,122,92,.16), transparent 62%),
  radial-gradient(760px 520px at -8% 108%, rgba(224,162,59,.14), transparent 60%), var(--paper); }
.green { color: #fff; background: radial-gradient(760px 460px at 88% -10%, rgba(224,162,59,.22), transparent 62%),
  linear-gradient(150deg, #1f7a5c 0%, #16573f 48%, #0f2a21 100%); }
.brand { display: flex; align-items: center; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; letter-spacing: -0.02em; }
.eyebrow { display: flex; align-items: center; gap: 12px; font-family: "IBM Plex Mono", monospace; font-weight: 500;
  text-transform: uppercase; letter-spacing: .16em; }
.eyebrow::before { content: ""; width: 28px; height: 2px; background: currentColor; }
.comb { display: flex; gap: 2px; align-items: flex-end; }
.comb i { flex: 1; height: 38%; border-radius: 2px; }
.comb i.now { height: 100%; background: var(--amber); }
.badge { position: absolute; background: #1f7a5c; color: #e7eceb; font-family: system-ui, sans-serif; font-weight: 700;
  text-align: center; }
.window { position: absolute; background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 40px 90px rgba(15,42,33,.28), 0 0 0 1px rgba(21,33,31,.10); }
.toolbar { position: relative; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 14px;
  background: #eef1f0; border-bottom: 1px solid rgba(21,33,31,.08); }
.dots { display: flex; gap: 7px; }
.dots i { display: block; width: 12px; height: 12px; border-radius: 50%; }
.dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
.address { flex: 1; height: 36px; border-radius: 18px; background: #fff; display: flex; align-items: center; gap: 8px;
  padding: 0 16px; font-size: 15px; color: #3c4043; box-shadow: inset 0 0 0 1px rgba(21,33,31,.08); }
.ext { position: relative; width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; background: rgba(31,122,92,.10); }
.ext img { display: block; width: 22px; height: 22px; }
.ext .badge { right: -6px; bottom: -3px; min-width: 22px; padding: 1px 4px; border-radius: 5px; font-size: 12px; line-height: 1.25;
  border: 1.5px solid #eef1f0; }
.skeleton { padding: 34px 38px; display: grid; gap: 16px; }
.skeleton i { display: block; height: 16px; border-radius: 8px; background: #eef2f1; }
.skeleton i.big { height: 64px; width: 55%; border-radius: 12px; }
.popup-shot { position: absolute; width: 360px; border-radius: 10px;
  box-shadow: 0 18px 50px rgba(15,42,33,.28), 0 0 0 1px rgba(21,33,31,.10); }
`;

const html = (width, height, bodyClass, css, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
html, body { width: ${width}px; height: ${height}px; } ${css}</style></head><body class="${bodyClass}">${body}</body></html>`;

const comb = (week, total) =>
  `<div class="comb">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 < week ? "past" : i + 1 === week ? "now" : ""}"></i>`).join("")}</div>`;

const toolbar = (address) => `<div class="toolbar"><div class="dots"><i></i><i></i><i></i></div>
  <div class="address">${address}</div>
  <div class="ext"><img src="${MARK}" alt=""><span class="badge">${currentWeek.week}</span></div></div>`;

const skeleton = `<div class="skeleton"><i class="big"></i><i style="width:80%"></i><i style="width:65%"></i><i style="width:72%"></i><i style="width:40%"></i></div>`;

function smallTile(lang) {
  const total = getWeeksInISOYear(currentWeek.year);
  return html(440, 280, "green", `
    .wrap { position: absolute; inset: 0; padding: 24px 28px 22px; display: grid; grid-template-columns: 1fr 112px;
      grid-template-rows: auto 1fr auto; column-gap: 10px; }
    .brand { grid-column: 1 / -1; font-size: 22px; gap: 10px; }
    .brand img { width: 34px; height: 34px; border-radius: 8px; box-shadow: 0 0 0 1.5px rgba(255,255,255,.22); }
    .headline { align-self: center; font-size: 32px; }
    .icon { position: relative; align-self: center; justify-self: end; width: 96px; height: 96px; }
    .icon img { width: 96px; height: 96px; border-radius: 22px; box-shadow: 0 14px 30px rgba(0,0,0,.30), 0 0 0 2px rgba(255,255,255,.18); }
    .icon .badge { right: -12px; bottom: -10px; font-size: 25px; line-height: 1; padding: 5px 8px; border-radius: 9px; border: 3px solid #fff; }
    .comb { grid-column: 1 / -1; height: 24px; }
    .comb i { background: rgba(255,255,255,.2); } .comb i.past { height: 60%; background: rgba(255,255,255,.6); }`,
    `<div class="wrap">
      <div class="brand"><img src="${MARK}" alt="">Viikko Nro</div>
      <div class="headline display">${COPY[lang].tileHeadline}</div>
      <div class="icon"><img src="${MARK}" alt=""><span class="badge">${currentWeek.week}</span></div>
      ${comb(currentWeek.week, total)}
    </div>`);
}

function marquee(lang) {
  const copy = COPY[lang];
  return html(1400, 560, "green", `
    .text { position: absolute; left: 84px; top: 0; bottom: 0; width: 650px; display: flex; flex-direction: column; justify-content: center; }
    .brand { font-size: 30px; gap: 14px; margin-bottom: 30px; }
    .brand img { width: 48px; height: 48px; border-radius: 11px; box-shadow: 0 0 0 2px rgba(255,255,255,.2); }
    .eyebrow { font-size: 15px; color: rgba(255,255,255,.72); margin-bottom: 16px; }
    h1 { font-size: 64px; }
    .sub { margin-top: 20px; max-width: 600px; font-size: 23px; line-height: 1.45; color: rgba(255,255,255,.86); }
    .chips { margin-top: 26px; display: flex; gap: 10px; }
    .chips span { font: 500 15px "IBM Plex Mono", monospace; padding: 7px 14px; border-radius: 999px;
      border: 1px solid rgba(255,255,255,.3); color: rgba(255,255,255,.92); }
    .window { left: 800px; top: 62px; width: 540px; height: 600px; }
    .popup-shot { right: 14px; top: 64px; }`,
    `<div class="text">
      <div class="brand"><img src="${MARK}" alt="">Viikko Nro</div>
      <div class="eyebrow">${copy.marqueeEyebrow}</div>
      <h1 class="display">${copy.marqueeHeadline}</h1>
      <p class="sub">${copy.marqueeSub}</p>
      <div class="chips">${copy.marqueeChips.map((chip) => `<span>${chip}</span>`).join("")}</div>
    </div>
    <div class="window">${toolbar("viikkonro.fi")}${skeleton}<img class="popup-shot" src="${fileUrl(work(`popup-${lang}.png`))}" alt=""></div>`);
}

const SHOT_CSS = `
  .shot-brand { position: absolute; left: 72px; top: 46px; font-size: 22px; gap: 10px; }
  .shot-brand img { width: 32px; height: 32px; }
  .text { position: absolute; left: 72px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; }
  .eyebrow { font-size: 14px; color: var(--accent-deep); margin-bottom: 18px; }
  h1 { font-size: 54px; }
  .lead { margin-top: 20px; font-size: 21px; line-height: 1.5; color: #243430; }
  .points { list-style: none; margin-top: 28px; display: grid; gap: 13px; }
  .points li { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 500; }
  .points li::before { content: ""; flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent) url("${CHECK}") center / 13px no-repeat; }
  .examples { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px; }
  .examples span { font: 600 18px "IBM Plex Mono", monospace; padding: 8px 14px; border-radius: 10px; background: #fff; border: 1px solid var(--line); color: var(--accent-deep); }
`;

function screenshotPage(lang, shot, visual, css = "") {
  const list = shot.points
    ? `<ul class="points">${shot.points.map((point) => `<li>${point}</li>`).join("")}</ul>`
    : `<div class="examples">${shot.examples.map((example) => `<span>${example}</span>`).join("")}</div>`;
  return html(1280, 800, "paper", SHOT_CSS + css,
    `<div class="brand shot-brand"><img src="${MARK}" alt="">Viikko Nro</div>
     <div class="text"><div class="eyebrow">${shot.eyebrow}</div><h1 class="display">${shot.title}</h1>
       <p class="lead">${shot.lead}</p>${list}</div>
     ${visual}`);
}

function omniboxRows(lang) {
  const template = messages[lang].omniboxWeek.message;
  return [0, 1, -1].map((offset) => {
    const year = currentWeek.year + offset;
    const { start, end } = getISOWeekRange(42, year);
    return template.replace("$WEEK$", "42").replace("$RANGE$", formatDateRange(start, end, lang));
  });
}

function screenshots(lang) {
  const [toolbarShot, calendarShot, addressShot, settingsShot, darkShot] = COPY[lang].shots;
  const popup = fileUrl(work(`popup-${lang}.png`));
  return [
    [toolbarShot, screenshotPage(lang, toolbarShot,
      `<div class="window" style="left:590px;top:64px;width:620px;height:672px">${toolbar("viikkonro.fi")}${skeleton}
        <img class="popup-shot" style="right:12px;top:64px" src="${popup}" alt=""></div>`)],
    [calendarShot, screenshotPage(lang, calendarShot,
      `<div class="stage"><img src="${fileUrl(work(`calendar-${lang}.png`))}" alt=""></div>`,
      `.stage { position: absolute; left: 640px; top: 50%; transform: translateY(-50%); padding: 14px; border-radius: 22px;
         background: var(--paper); box-shadow: 0 40px 90px rgba(15,42,33,.22), 0 0 0 1px rgba(21,33,31,.08); }
       .stage img { display: block; width: 470px; }`)],
    [addressShot, screenshotPage(lang, addressShot,
      `<div class="window" style="left:590px;top:190px;width:620px;height:430px">
         ${toolbar(`<span class="kw"><img src="${MARK}" alt="">Viikko Nro</span><span>42</span><span class="caret"></span>`)}
         ${skeleton}
         <div class="suggest">${omniboxRows(lang).map((row, i) => `<div class="row${i === 0 ? " sel" : ""}"><img src="${MARK}" alt="">${row}</div>`).join("")}</div>
       </div>`,
      `.kw { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 6px; border-radius: 999px;
         background: rgba(31,122,92,.12); color: var(--accent-deep); font-weight: 600; font-size: 14px; }
       .kw img { width: 16px; height: 16px; }
       .caret { width: 1.5px; height: 18px; background: var(--ink); margin-left: -6px; }
       .suggest { position: absolute; top: 50px; left: 88px; right: 62px; padding: 6px 0; background: #fff; border-radius: 0 0 14px 14px;
         box-shadow: 0 18px 40px rgba(15,42,33,.18), 0 0 0 1px rgba(21,33,31,.08); }
       .row { display: flex; align-items: center; gap: 12px; height: 50px; padding: 0 18px; font-size: 17px; }
       .row.sel { background: rgba(31,122,92,.10); }
       .row img { width: 18px; height: 18px; }`)],
    [settingsShot, screenshotPage(lang, settingsShot,
      `<div class="window" style="left:590px;top:64px;width:620px;height:672px">${toolbar("chrome-extension://viikko-nro/options.html")}
        <img style="display:block;width:620px" src="${fileUrl(work(`options-${lang}.png`))}" alt=""></div>`)],
    [darkShot, screenshotPage(lang, darkShot,
      `<div class="stage dark"><img src="${fileUrl(work(`dark-${lang}.png`))}" alt=""></div>`,
      `.stage { position: absolute; left: 660px; top: 50%; transform: translateY(-50%); padding: 14px; border-radius: 22px;
         background: #0f1716; box-shadow: 0 40px 90px rgba(15,42,33,.35), 0 0 0 1px rgba(21,33,31,.2); }
       .stage img { display: block; width: 440px; }`)],
  ];
}

async function render(name, width, height, source, outFile) {
  const htmlFile = work(`${name}.html`);
  writeFileSync(htmlFile, source);
  await page.setViewportSize({ width, height });
  await page.goto(fileUrl(htmlFile));
  await settle();
  // Rendered at 2× and downsampled: sharper text than a 1× render.
  const image = await page.screenshot();
  mkdirSync(path.dirname(outFile), { recursive: true });
  await sharp(image).resize(width, height).removeAlpha().png({ compressionLevel: 9 }).toFile(outFile);
  const meta = await sharp(outFile).metadata();
  console.log(`${path.relative(root, outFile)}  ${meta.width}×${meta.height}  ${meta.channels} channels`);
}

for (const lang of LANGS) {
  const out = (file) => path.join(root, "store", lang, file);
  await render(`small-${lang}`, 440, 280, smallTile(lang), out("promo-small-440x280.png"));
  await render(`marquee-${lang}`, 1400, 560, marquee(lang), out("promo-marquee-1400x560.png"));
  for (const [shot, source] of screenshots(lang)) {
    await render(`shot-${shot.id}-${lang}`, 1280, 800, source, out(`screenshot-${shot.id}.png`));
  }
}

await context.close();
console.log(`Showcase date ${now.toDateString()}, week ${currentWeek.week}/${currentWeek.year}, city ${SHOWCASE_CITY}.`);
