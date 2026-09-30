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

/** "Lokakuu 2026" / "October 2026". */
export function formatMonth(year: number, month: number, lang: Lang): string {
  const name = new Intl.DateTimeFormat(LOCALE[lang], { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  return name.charAt(0).toLocaleUpperCase(LOCALE[lang]) + name.slice(1);
}

/** Short weekday names Monday first: "ma" … "su" / "Mon" … "Sun". */
export function weekdayNamesShort(lang: Lang): string[] {
  const format = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short" });
  // 5 January 2026 is a Monday.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 0, 5 + index)));
}

/** Capitalized weekday name, "Perjantai" / "Friday". */
export function formatWeekday(date: Date, lang: Lang): string {
  const name = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long" }).format(date);
  return name.charAt(0).toLocaleUpperCase(LOCALE[lang]) + name.slice(1);
}
