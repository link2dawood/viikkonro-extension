// Finnish public holidays (pyhäpäivät) and the two eves that are days off in
// practice. Computed from the calendar, so every year works without bundled
// data: fixed dates, Easter-based dates, and the Saturday rules for Juhannus
// and Pyhäinpäivä.

import { t, type Lang, type MessageKey } from "./i18n";
import { addDays, daysBetween, getISOWeekRange, makeDate, startOfDay, toISODate, type WeekRef } from "./week";

export type PublicHolidayKey =
  | "newYear"
  | "epiphany"
  | "goodFriday"
  | "easterSunday"
  | "easterMonday"
  | "mayDay"
  | "ascension"
  | "whitSunday"
  | "midsummerEve"
  | "midsummerDay"
  | "allSaints"
  | "independence"
  | "christmasEve"
  | "christmasDay"
  | "boxingDay";

export interface PublicHoliday {
  key: PublicHolidayKey;
  date: Date;
  /** false for Juhannusaatto and Jouluaatto: not in law, but days off in practice. */
  official: boolean;
}

export const PUBLIC_HOLIDAY_NAME: Record<PublicHolidayKey, MessageKey> = {
  newYear: "phNewYear",
  epiphany: "phEpiphany",
  goodFriday: "phGoodFriday",
  easterSunday: "phEasterSunday",
  easterMonday: "phEasterMonday",
  mayDay: "phMayDay",
  ascension: "phAscension",
  whitSunday: "phWhitSunday",
  midsummerEve: "phMidsummerEve",
  midsummerDay: "phMidsummerDay",
  allSaints: "phAllSaints",
  independence: "phIndependence",
  christmasEve: "phChristmasEve",
  christmasDay: "phChristmasDay",
  boxingDay: "phBoxingDay",
};

/** Western (Gregorian) Easter Sunday: the anonymous Gregorian algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** The first date on weekday `weekday` (0 = Sunday … 6 = Saturday) on or after `from`. */
function firstWeekdayFrom(from: Date, weekday: number): Date {
  return addDays(from, (weekday - from.getDay() + 7) % 7);
}

function fixed(year: number, month: number, day: number): Date {
  // Fixed holidays are real dates in every year, so makeDate never returns null here.
  return makeDate(year, month, day) ?? new Date(year, month - 1, day);
}

/** The year's holidays in date order. */
export function publicHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year);
  const midsummerDay = firstWeekdayFrom(fixed(year, 6, 20), 6);
  const holidays: [PublicHolidayKey, Date, boolean][] = [
    ["newYear", fixed(year, 1, 1), true],
    ["epiphany", fixed(year, 1, 6), true],
    ["goodFriday", addDays(easter, -2), true],
    ["easterSunday", easter, true],
    ["easterMonday", addDays(easter, 1), true],
    ["mayDay", fixed(year, 5, 1), true],
    ["ascension", addDays(easter, 39), true],
    ["whitSunday", addDays(easter, 49), true],
    ["midsummerEve", addDays(midsummerDay, -1), false],
    ["midsummerDay", midsummerDay, true],
    ["allSaints", firstWeekdayFrom(fixed(year, 10, 31), 6), true],
    ["independence", fixed(year, 12, 6), true],
    ["christmasEve", fixed(year, 12, 24), false],
    ["christmasDay", fixed(year, 12, 25), true],
    ["boxingDay", fixed(year, 12, 26), true],
  ];
  return holidays
    .map(([key, date, official]) => ({ key, date, official }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Holidays from `start` to `end`, both inclusive, in date order. */
export function publicHolidaysBetween(start: Date, end: Date): PublicHoliday[] {
  const from = startOfDay(start);
  const to = startOfDay(end);
  const result: PublicHoliday[] = [];
  for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
    for (const holiday of publicHolidays(year)) {
      if (holiday.date >= from && holiday.date <= to) result.push(holiday);
    }
  }
  return result;
}

export function publicHolidaysOn(date: Date): PublicHoliday[] {
  const key = toISODate(date);
  return publicHolidays(date.getFullYear()).filter((holiday) => toISODate(holiday.date) === key);
}

/** The first holiday strictly after `today`, with whole days until it. */
export function nextPublicHoliday(today: Date): { holiday: PublicHoliday; daysUntil: number } {
  const day = startOfDay(today);
  // Every year has holidays after 26 December of the year before, so two years always suffice.
  const holiday = [...publicHolidays(day.getFullYear()), ...publicHolidays(day.getFullYear() + 1)].find(
    (candidate) => candidate.date > day,
  ) as PublicHoliday;
  return { holiday, daysUntil: daysBetween(day, holiday.date) };
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

/** Monday–Friday days from `start` to `end` (inclusive) that aren't holidays or eves. */
export function workdaysBetween(start: Date, end: Date): number {
  const from = startOfDay(start);
  const days = daysBetween(from, end);
  if (days < 0) return 0;
  const off = new Set(publicHolidaysBetween(from, end).map((holiday) => toISODate(holiday.date)));
  let count = 0;
  for (let offset = 0; offset <= days; offset++) {
    const date = addDays(from, offset);
    if (!isWeekend(date) && !off.has(toISODate(date))) count++;
  }
  return count;
}

export interface WeekWorkdays {
  workdays: number;
  /** Every holiday in the week, weekend ones included. */
  holidays: PublicHoliday[];
}

export function workdaysText(count: number, lang: Lang): string {
  return count === 1 ? t(lang, "workdaysOne") : t(lang, "workdaysMany", count);
}

export function weekWorkdays(ref: WeekRef): WeekWorkdays {
  const { start, end } = getISOWeekRange(ref.week, ref.year);
  return { workdays: workdaysBetween(start, end), holidays: publicHolidaysBetween(start, end) };
}

// Address bar names: lowercase, with ä/ö/å folded so "paasiainen" matches too.
// Each list holds the holiday's Finnish, English and Swedish names plus common short forms.
const SEARCH_NAMES: Record<PublicHolidayKey, string[]> = {
  newYear: ["uudenvuodenpäivä", "uusivuosi", "new year", "nyårsdagen", "nyår"],
  epiphany: ["loppiainen", "epiphany", "trettondagen"],
  goodFriday: ["pitkäperjantai", "good friday", "långfredagen"],
  easterSunday: ["pääsiäinen", "pääsiäispäivä", "easter", "påsk", "påskdagen"],
  easterMonday: ["toinen pääsiäispäivä", "easter monday", "annandag påsk"],
  mayDay: ["vappu", "may day", "första maj", "valborg"],
  ascension: ["helatorstai", "ascension", "kristi himmelsfärdsdag"],
  whitSunday: ["helluntai", "helluntaipäivä", "whitsun", "pentecost", "pingst", "pingstdagen"],
  midsummerEve: ["juhannusaatto", "midsummer eve", "midsommarafton"],
  midsummerDay: ["juhannus", "juhannuspäivä", "midsummer", "midsommar", "midsommardagen"],
  allSaints: ["pyhäinpäivä", "all saints", "alla helgons dag"],
  independence: ["itsenäisyyspäivä", "independence day", "självständighetsdagen"],
  christmasEve: ["jouluaatto", "christmas eve", "julafton"],
  christmasDay: ["joulu", "joulupäivä", "christmas", "jul", "juldagen"],
  boxingDay: ["tapaninpäivä", "tapani", "boxing day", "annandag jul", "stefansdagen"],
};

export function foldName(text: string): string {
  return text
    .toLocaleLowerCase("fi")
    .replace(/[äå]/g, "a")
    .replace(/ö/g, "o")
    .replace(/\s+/g, " ")
    .trim();
}

export const MIN_HOLIDAY_QUERY = 3;

/**
 * Holidays whose name starts with `query`, exact name matches first, each
 * resolved to its next occurrence on or after `today`. `year` pins the year.
 */
export function findPublicHolidays(query: string, today: Date, year?: number): PublicHoliday[] {
  const needle = foldName(query);
  if (needle.length < MIN_HOLIDAY_QUERY) return [];
  const day = startOfDay(today);
  const scored: { rank: number; holiday: PublicHoliday }[] = [];

  for (const [key, names] of Object.entries(SEARCH_NAMES) as [PublicHolidayKey, string[]][]) {
    const folded = names.map(foldName);
    const rank = folded.includes(needle) ? 0 : folded.some((name) => name.startsWith(needle)) ? 1 : -1;
    if (rank < 0) continue;
    const pick = (y: number) => publicHolidays(y).find((holiday) => holiday.key === key) as PublicHoliday;
    let holiday = pick(year ?? day.getFullYear());
    if (year === undefined && holiday.date < day) holiday = pick(day.getFullYear() + 1);
    scored.push({ rank, holiday });
  }

  return scored
    .sort((a, b) => a.rank - b.rank || a.holiday.date.getTime() - b.holiday.date.getTime())
    .map((entry) => entry.holiday);
}
