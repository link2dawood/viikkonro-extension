import { formatDateRange } from "./format";
import { t, type Lang } from "./i18n";
import { hasWeekPage, sitePath, siteUrl } from "./site";
import {
  getISOWeekRange,
  getWeekRef,
  isValidWeek,
  makeDate,
  parseISODate,
  shiftWeek,
  type WeekRef,
} from "./week";

export const MAX_SUGGESTIONS = 5;

/** Weeks matching the input, best match first; [] when the input isn't a valid week. */
export function parseOmniboxInput(input: string, today: Date): WeekRef[] {
  const text = input.trim().replace(/\s+/g, " ");
  const current = getWeekRef(today);
  let match: RegExpExecArray | null;
  let weeks: WeekRef[];

  if (text === "") {
    weeks = [current, shiftWeek(current, 1), shiftWeek(current, -1)];
  } else if ((match = /^(\d{1,2})$/.exec(text))) {
    // "42": this week-year first. Other years only as alternatives, so an
    // invalid week in this year (53 in a 52-week year) stays invalid.
    const week = Number(match[1]);
    if (!isValidWeek(week, current.year)) return [];
    weeks = [current.year, current.year + 1, current.year - 1].map((year) => ({ week, year }));
  } else if ((match = /^(\d{1,2})[ /](\d{4})$/.exec(text))) {
    weeks = [{ week: Number(match[1]), year: Number(match[2]) }];
  } else if ((match = /^(\d{4})-?W(\d{1,2})$/i.exec(text))) {
    weeks = [{ week: Number(match[2]), year: Number(match[1]) }];
  } else if ((match = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(text))) {
    // "13.10.2026", or "13.10." for this calendar year.
    const year = match[3] === undefined ? today.getFullYear() : Number(match[3]);
    const date = makeDate(year, Number(match[2]), Number(match[1]));
    weeks = date ? [getWeekRef(date)] : [];
  } else {
    const date = parseISODate(text);
    weeks = date ? [getWeekRef(date)] : [];
  }

  // Only weeks the site has a page for: Enter must never open a 404.
  return weeks.filter((ref) => isValidWeek(ref.week, ref.year) && hasWeekPage(ref.year, today));
}

export interface OmniboxSuggestions {
  defaultDescription: string;
  suggestions: { content: string; description: string }[];
}

export function describeWeek(ref: WeekRef, lang: Lang): string {
  const { start, end } = getISOWeekRange(ref.week, ref.year);
  return t(lang, "omniboxWeek", ref.week, formatDateRange(start, end, lang));
}

export function buildSuggestions(input: string, today: Date, lang: Lang): OmniboxSuggestions {
  const [first, ...rest] = parseOmniboxInput(input, today);
  if (!first) return { defaultDescription: t(lang, "omniboxInvalid"), suggestions: [] };
  const typed = input.trim();
  return {
    defaultDescription: describeWeek(first, lang),
    suggestions: rest
      .map((ref) => ({ content: `${ref.week} ${ref.year}`, description: describeWeek(ref, lang) }))
      // The browser drops a suggestion whose content equals the typed text.
      .filter((suggestion) => suggestion.content !== typed)
      .slice(0, MAX_SUGGESTIONS),
  };
}

/** URL opened on Enter, or null when the input isn't a valid week. */
export function omniboxTargetUrl(input: string, today: Date): string | null {
  const [first] = parseOmniboxInput(input, today);
  return first ? siteUrl(sitePath.week(first.week, first.year), "omnibox") : null;
}
