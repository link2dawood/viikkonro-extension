import { formatDate, formatDateRange, formatWeekdayInline } from "./format";
import { t, type Lang } from "./i18n";
import {
  findPublicHolidays,
  PUBLIC_HOLIDAY_NAME,
  weekWorkdays,
  workdaysBetween,
  workdaysText,
  type PublicHoliday,
} from "./publicHolidays";
import { hasWeekPage, sitePath, siteUrl } from "./site";
import {
  addDays,
  daysBetween,
  getISOWeekRange,
  getWeekRef,
  getWeeksInISOYear,
  isValidWeek,
  makeDate,
  parseISODate,
  shiftWeek,
  type WeekRef,
} from "./week";

export const MAX_SUGGESTIONS = 5;

// Longest range "vk 1-53" can describe; also keeps a wrapped range ("50-3") sane.
const MAX_RANGE_WEEKS = 53;
// "vk +520" would walk ten years; cap relative jumps at about two years.
const MAX_RELATIVE_WEEKS = 104;

/** One address bar result. Every kind opens `ref`'s week page on Enter. */
export type OmniboxMatch =
  | { kind: "week"; ref: WeekRef }
  | { kind: "range"; ref: WeekRef; end: WeekRef }
  | { kind: "holiday"; ref: WeekRef; holiday: PublicHoliday }
  | { kind: "date"; ref: WeekRef; date: Date }
  | { kind: "dateRange"; ref: WeekRef; start: Date; end: Date };

function week(ref: WeekRef): OmniboxMatch {
  return { kind: "week", ref };
}

function onDate(date: Date | null): OmniboxMatch[] {
  return date ? [{ kind: "date", ref: getWeekRef(date), date }] : [];
}

// "1.3.–15.6." spans at most ten years, which keeps the working-day count cheap.
const MAX_RANGE_DAYS = 3660;

function dateRange(start: Date | null, end: Date | null): OmniboxMatch[] {
  if (!start || !end) return [];
  const days = daysBetween(start, end);
  if (days < 0 || days > MAX_RANGE_DAYS) return [];
  return [{ kind: "dateRange", ref: getWeekRef(start), start, end }];
}

/** "1.3.–15.6.", "1.3.2027-15.6.", "28.12.–3.1." (rolls into the next year). */
function parseDottedRange(match: RegExpExecArray, today: Date): OmniboxMatch[] {
  const [, d1, m1, y1, d2, m2, y2] = match;
  const endYear = y2 ? Number(y2) : y1 ? Number(y1) : today.getFullYear();
  let start = makeDate(y1 ? Number(y1) : endYear, Number(m1), Number(d1));
  let end = makeDate(endYear, Number(m2), Number(d2));
  if (start && end && end < start) {
    // A missing year rolls over: "28.12.–3.1." ends the January after,
    // "15.6.–1.3.2027" starts the June before.
    if (!y2) end = makeDate(endYear + 1, Number(m2), Number(d2));
    else if (!y1) start = makeDate(endYear - 1, Number(m1), Number(d1));
  }
  return dateRange(start, end);
}

function parseRange(from: number, to: number, year: number): OmniboxMatch[] {
  if (!isValidWeek(from, year)) return [];
  // "50-3" wraps into the next week-year.
  const endYear = to < from ? year + 1 : year;
  if (!isValidWeek(to, endYear)) return [];
  const end = { week: to, year: endYear };
  const weeks = endYear === year ? to - from + 1 : getWeeksInISOYear(year) - from + 1 + to;
  if (weeks > MAX_RANGE_WEEKS) return [];
  return [{ kind: "range", ref: { week: from, year }, end }];
}

/** Matches for the input, best first; [] when the input isn't a valid week. */
export function parseOmniboxQuery(input: string, today: Date): OmniboxMatch[] {
  const text = input.trim().replace(/\s+/g, " ");
  const current = getWeekRef(today);
  let match: RegExpExecArray | null;
  let matches: OmniboxMatch[];

  if (text === "") {
    matches = [current, shiftWeek(current, 1), shiftWeek(current, -1)].map(week);
  } else if ((match = /^(\d{1,2})$/.exec(text))) {
    // "42": this week-year first. Other years only as alternatives, so an
    // invalid week in this year (53 in a 52-week year) stays invalid.
    const number = Number(match[1]);
    if (!isValidWeek(number, current.year)) return [];
    matches = [current.year, current.year + 1, current.year - 1].map((year) => week({ week: number, year }));
  } else if ((match = /^(\d{1,2})[ /](\d{4})$/.exec(text))) {
    matches = [week({ week: Number(match[1]), year: Number(match[2]) })];
  } else if ((match = /^(\d{4})-?W(\d{1,2})$/i.exec(text))) {
    matches = [week({ week: Number(match[2]), year: Number(match[1]) })];
  } else if ((match = /^([+-])\s?(\d{1,3})$/.exec(text))) {
    // "+3" / "-2": weeks from the current one.
    const offset = Number(match[2]) * (match[1] === "-" ? -1 : 1);
    matches = Math.abs(offset) <= MAX_RELATIVE_WEEKS ? [week(shiftWeek(current, offset))] : [];
  } else if ((match = /^(\d{1,2}) ?[-–] ?(\d{1,2})(?:[ /](\d{4}))?$/.exec(text))) {
    // "42-50" or "42-50 2027": a range of weeks.
    matches = parseRange(Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : current.year);
  } else if ((match = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})? ?[-–] ?(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(text))) {
    matches = parseDottedRange(match, today);
  } else if ((match = /^(\d{4}-\d{2}-\d{2}) ?(?:–|\.\.| - ) ?(\d{4}-\d{2}-\d{2})$/.exec(text))) {
    // "2026-10-01..2026-12-31": ISO dates need a separator that isn't a bare hyphen.
    matches = dateRange(parseISODate(match[1] as string), parseISODate(match[2] as string));
  } else if ((match = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(text))) {
    // "13.10.2026", or "13.10." for this calendar year.
    const year = match[3] === undefined ? today.getFullYear() : Number(match[3]);
    matches = onDate(makeDate(year, Number(match[2]), Number(match[1])));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    matches = onDate(parseISODate(text));
  } else {
    // "juhannus", "joulu 2027", "pääsiäinen".
    const named = /^(.*?)(?: (\d{4}))?$/.exec(text) as RegExpExecArray;
    const year = named[2] === undefined ? undefined : Number(named[2]);
    matches = findPublicHolidays(named[1] ?? "", today, year).map((holiday) => ({
      kind: "holiday",
      ref: getWeekRef(holiday.date),
      holiday,
    }));
  }

  // Only weeks the site has a page for: Enter must never open a 404.
  return matches.filter(
    (candidate) => isValidWeek(candidate.ref.week, candidate.ref.year) && hasWeekPage(candidate.ref.year, today),
  );
}

/** The weeks the input resolves to, best match first. */
export function parseOmniboxInput(input: string, today: Date): WeekRef[] {
  return parseOmniboxQuery(input, today).map((candidate) => candidate.ref);
}

export interface OmniboxSuggestions {
  defaultDescription: string;
  suggestions: { content: string; description: string }[];
}

export function describeWeek(ref: WeekRef, lang: Lang): string {
  const { start, end } = getISOWeekRange(ref.week, ref.year);
  const text = t(lang, "omniboxWeek", ref.week, formatDateRange(start, end, lang));
  // A short week is worth a mention; a normal five-day week isn't.
  const { workdays } = weekWorkdays(ref);
  return workdays < 5 ? `${text} · ${workdaysText(workdays, lang)}` : text;
}

function daysText(count: number, lang: Lang): string {
  return count === 1 ? t(lang, "daysOne") : t(lang, "daysMany", count);
}

/** "85 päivän päästä, 58 työpäivää siihen asti" / "3 päivää sitten" / "tänään". */
export function relativeDayText(date: Date, today: Date, lang: Lang): string {
  const days = daysBetween(today, date);
  if (days === 0) return t(lang, "whenToday");
  if (days === 1) return t(lang, "countdownTomorrow");
  if (days === -1) return t(lang, "whenYesterday");
  if (days < 0) return t(lang, "whenAgo", -days);
  // Working days from today up to the day before: the ones left to use.
  const workdays = workdaysBetween(today, addDays(date, -1));
  return t(lang, "whenAhead", t(lang, "countdownInDays", days), workdaysText(workdays, lang));
}

function weekdayAndDate(date: Date, lang: Lang): string {
  return `${formatWeekdayInline(date, lang)} ${formatDate(date, lang)}`;
}

export function describeMatch(match: OmniboxMatch, lang: Lang, today: Date): string {
  if (match.kind === "week") return describeWeek(match.ref, lang);
  if (match.kind === "date") {
    return t(lang, "omniboxDate", weekdayAndDate(match.date, lang), match.ref.week, relativeDayText(match.date, today, lang));
  }
  if (match.kind === "dateRange") {
    return t(
      lang,
      "omniboxDateRange",
      formatDateRange(match.start, match.end, lang),
      daysText(daysBetween(match.start, match.end) + 1, lang),
      workdaysText(workdaysBetween(match.start, match.end), lang),
    );
  }
  if (match.kind === "holiday") {
    const { holiday } = match;
    return t(
      lang,
      "omniboxHoliday",
      t(lang, PUBLIC_HOLIDAY_NAME[holiday.key]),
      weekdayAndDate(holiday.date, lang),
      match.ref.week,
    );
  }
  const start = getISOWeekRange(match.ref.week, match.ref.year).start;
  const end = getISOWeekRange(match.end.week, match.end.year).end;
  const weeks = (daysBetween(start, end) + 1) / 7;
  return t(
    lang,
    "omniboxRange",
    `${match.ref.week}–${match.end.week}`,
    formatDateRange(start, end, lang),
    weeks,
    workdaysText(workdaysBetween(start, end), lang),
  );
}

function contentFor(match: OmniboxMatch): string {
  return `${match.ref.week} ${match.ref.year}`;
}

export function buildSuggestions(input: string, today: Date, lang: Lang): OmniboxSuggestions {
  const [first, ...rest] = parseOmniboxQuery(input, today);
  if (!first) return { defaultDescription: t(lang, "omniboxInvalid"), suggestions: [] };
  const typed = input.trim();
  return {
    defaultDescription: describeMatch(first, lang, today),
    suggestions: rest
      .map((match) => ({ content: contentFor(match), description: describeMatch(match, lang, today) }))
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
