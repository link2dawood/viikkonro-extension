// Emits the extension's bundled data slice from the viikkonro.fi site repo
// (FR-4.2). The site's own data modules are imported directly, so the popup
// can never show a date the site doesn't. Nothing here is hand-typed.
//
//   VIIKKONRO_SITE_DIR=/path/to/weekdays pnpm data:sync
//
// The output is committed, so `pnpm build` (and an AMO reviewer rebuilding
// from the source zip) never needs the site repo.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteDir = process.env.VIIKKONRO_SITE_DIR;
if (!siteDir) {
  console.error("Set VIIKKONRO_SITE_DIR to the viikkonro.fi site repo, e.g.\n  VIIKKONRO_SITE_DIR=~/Documents/Projects/weekdays pnpm data:sync");
  process.exit(1);
}
const siteRoot = path.resolve(siteDir);
const fromSite = (file) => import(pathToFileURL(path.join(siteRoot, file)).href);

const { schoolHolidayPage, SCHOOL_HOLIDAY_SOURCES } = await fromSite("src/data/schoolHolidayPages.js");
const { flagDaysInYear } = await fromSite("src/data/flagDayPages.js");
const { CALENDAR_META, nameDaysForDate } = await fromSite("src/data/nameDays.js");

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const now = new Date();
// FR-4.3: current calendar year plus the next, nothing more.
const years = [now.getFullYear(), now.getFullYear() + 1];

const dated = [];
const undated = [];
const schoolHolidayYears = [];
for (const year of years) {
  const page = schoolHolidayPage(year);
  if (!page) continue;
  schoolHolidayYears.push(year);
  const groups = [
    ...page.winter.map((group) => ({ ...group, type: "hiihtoloma" })),
    ...page.autumn.map((group) => ({ ...group, type: "syysloma" })),
  ];
  for (const group of groups) {
    dated.push({
      type: group.type,
      year,
      week: group.week,
      start: isoDate(group.startDate),
      end: isoDate(group.endDate),
      cities: group.cities,
      confidence: group.confidence,
      sourceUrl: SCHOOL_HOLIDAY_SOURCES[group.sourceKey].url,
    });
  }
  // Tier C on the site: named cities with no published date. Carried over
  // without a date so the popup can say "not confirmed yet" instead of
  // inventing one or silently skipping the city.
  if (page.autumnUnknownCities?.length) {
    undated.push({ type: "syysloma", year, cities: page.autumnUnknownCities, confidence: "unknown" });
  }
}
dated.sort((a, b) => a.start.localeCompare(b.start));
const cities = [...new Set([...dated, ...undated].flatMap((p) => p.cities))].sort((a, b) =>
  a.localeCompare(b, "fi"),
);

const flagDays = years.flatMap((year) =>
  flagDaysInYear(year).map((day) => ({
    date: isoDate(day.date),
    name: day.name,
    altName: day.altName,
    slug: day.slug,
  })),
);

// Name days ship only once the site marks its calendar complete, i.e. once
// the Almanakkatoimisto licensing question is settled. Until then: null.
let nameDays = null;
if (CALENDAR_META.complete) {
  const byDate = {};
  const leapYear = new Date(2024, 0, 1);
  for (let i = 0; i < 366; i++) {
    const date = new Date(leapYear.getFullYear(), 0, 1 + i);
    const names = nameDaysForDate(date);
    if (names.length) byDate[`${pad(date.getMonth() + 1)}-${pad(date.getDate())}`] = names;
  }
  nameDays = { attribution: CALENDAR_META.attribution, sourceUrl: CALENDAR_META.sourceUrl, byDate };
}

let commit = null;
try {
  commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: siteRoot, encoding: "utf8" }).trim();
} catch {
  // Not a git checkout; the commit is informational only.
}

const dataset = {
  generatedAt: isoDate(now),
  source: { site: "viikkonro.fi", commit },
  years,
  schoolHolidays: { years: schoolHolidayYears, cities, dated, undated },
  flagDays,
  nameDays,
};

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/data/generated/dataset.json");
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(dataset, null, 2) + "\n");

console.log(
  `dataset.json: ${dated.length} dated + ${undated.length} undated school holiday periods (${schoolHolidayYears.join(", ") || "none"}), ` +
    `${cities.length} cities, ${flagDays.length} flag days, name days ${nameDays ? "included" : "not bundled"}; site ${commit ?? "unknown"}`,
);
const missing = years.filter((y) => !schoolHolidayYears.includes(y));
if (missing.length) console.warn(`warning: site has no school holiday data for ${missing.join(", ")}; the build will refuse to run`);
