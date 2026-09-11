import type { Lang } from "./i18n";

const LOCALE: Record<Lang, string> = { fi: "fi-FI", en: "en-GB" };

// fi-FI numeric gives the site's own compact forms ("12.10.2026",
// "12.–18.10.2026", "28.12.2026–3.1.2027"); en-GB reads better with a short
// month name ("12–18 Oct 2026").
const DATE_OPTIONS: Record<Lang, Intl.DateTimeFormatOptions> = {
  fi: { day: "numeric", month: "numeric", year: "numeric" },
  en: { day: "numeric", month: "short", year: "numeric" },
};

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], DATE_OPTIONS[lang]).format(date);
}

export function formatDateRange(start: Date, end: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], DATE_OPTIONS[lang]).formatRange(start, end);
}

/** Capitalized weekday name, "Perjantai" / "Friday". */
export function formatWeekday(date: Date, lang: Lang): string {
  const name = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long" }).format(date);
  return name.charAt(0).toLocaleUpperCase(LOCALE[lang]) + name.slice(1);
}
