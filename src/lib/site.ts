// Every link to viikkonro.fi is built here (FR-8.2), so no surface can ship
// an untagged URL.

export const SITE_ORIGIN = "https://viikkonro.fi";

export type Campaign = "popup" | "omnibox" | "options" | "install" | "uninstall";

export function siteUrl(path: string, campaign: Campaign, hash?: string): string {
  const url = new URL(path, SITE_ORIGIN);
  url.searchParams.set("utm_source", "extension");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", campaign);
  if (hash) url.hash = hash;
  return url.href;
}

// Routes as defined in the site's src/AppRoutes.jsx.
export const sitePath = {
  home: "/",
  week: (week: number, year: number) => `/viikko-${week}-${year}`,
  schoolHolidays: (year: number) => `/koululomat-${year}`,
  // Rows on this page carry the flag day's slug as their id.
  flagDays: (year: number) => `/liputuspaivat-${year}`,
  nameDaysToday: "/nimipaivat/tanaan",
  privacy: "/tietosuoja",
  contact: "/ota-yhteytta",
} as const;

// The site prerenders week pages from 2020 to the build year + 9 and 404s
// outside that window (PRERENDER_MIN_YEAR / PRERENDER_MAX_YEAR in dateUtils.js).
export function hasWeekPage(year: number, today: Date): boolean {
  return year >= 2020 && year <= today.getFullYear() + 9;
}
