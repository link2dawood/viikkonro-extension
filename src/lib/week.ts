// ISO 8601 week math (FR-4.1). Pure functions over local calendar dates:
// inputs are never mutated, and every day offset goes through the Date
// constructor or UTC day numbers so DST changes can't shift a result.

const DAY_MS = 86_400_000;

export interface WeekRef {
  week: number;
  year: number;
}

export interface WeekRange {
  start: Date;
  end: Date;
}

/** Local midnight `days` after `date`. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfDay(date: Date): Date {
  return addDays(date, 0);
}

/** Monday = 0 … Sunday = 6. */
function isoDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function utcDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return utcDayNumber(to) - utcDayNumber(from);
}

// The Thursday of a date's ISO week decides both its week-year and number.
function thursdayOf(date: Date): Date {
  return addDays(date, 3 - isoDayIndex(date));
}

export function getISOWeekYear(date: Date): number {
  return thursdayOf(date).getFullYear();
}

export function getISOWeek(date: Date): number {
  const thursday = thursdayOf(date);
  const ordinal = daysBetween(new Date(thursday.getFullYear(), 0, 1), thursday);
  return Math.floor(ordinal / 7) + 1;
}

export function getWeekRef(date: Date): WeekRef {
  return { week: getISOWeek(date), year: getISOWeekYear(date) };
}

/** 52 or 53. 28 December always falls in the year's last ISO week. */
export function getWeeksInISOYear(year: number): number {
  return getISOWeek(new Date(year, 11, 28));
}

export function isValidWeek(week: number, year: number): boolean {
  return Number.isInteger(week) && Number.isInteger(year) && week >= 1 && week <= getWeeksInISOYear(year);
}

/** Monday–Sunday of ISO week `week` in ISO week-year `year`. */
export function getISOWeekRange(week: number, year: number): WeekRange {
  // 4 January is always in week 1.
  const jan4 = new Date(year, 0, 4);
  const start = addDays(jan4, (week - 1) * 7 - isoDayIndex(jan4));
  return { start, end: addDays(start, 6) };
}

/** The week `offset` weeks away, rolling across week-year boundaries. */
export function shiftWeek(ref: WeekRef, offset: number): WeekRef {
  return getWeekRef(addDays(getISOWeekRange(ref.week, ref.year).start, offset * 7));
}

export function toISODate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Parses "YYYY-MM-DD" as a local date; null for anything that isn't a real date. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Local date from 1-indexed parts; null when the parts roll over (31.2.). */
export function makeDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  // new Date(y, …) maps years 0–99 to 1900–1999.
  if (year < 100) return null;
  return date;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextMidnight(now: Date): number {
  return addDays(now, 1).getTime() - now.getTime();
}
