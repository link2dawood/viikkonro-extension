// The popup's month view. A week belongs to the month its Thursday is in,
// the same rule ISO uses to give a week to a year.

import { addDays, daysBetween, getISOWeekRange, getWeekRef, type WeekRef } from "./week";

export interface MonthRef {
  year: number;
  /** 0 = January. */
  month: number;
}

export interface CalendarRow {
  ref: WeekRef;
  /** Monday … Sunday. */
  days: Date[];
}

export function monthOfWeek(ref: WeekRef): MonthRef {
  const thursday = addDays(getISOWeekRange(ref.week, ref.year).start, 3);
  return { year: thursday.getFullYear(), month: thursday.getMonth() };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Every week with a day in the month, 4 to 6 rows. */
export function monthGrid({ year, month }: MonthRef): CalendarRow[] {
  const first = getWeekRef(new Date(year, month, 1));
  const lastDay = new Date(year, month + 1, 0);
  const rows: CalendarRow[] = [];
  let start = getISOWeekRange(first.week, first.year).start;
  while (start <= lastDay) {
    rows.push({ ref: getWeekRef(start), days: Array.from({ length: 7 }, (_, index) => addDays(start, index)) });
    start = addDays(start, 7);
  }
  return rows;
}

/** The week to select when stepping to `target`: today's week in today's month, else the month's first week. */
export function weekForMonth(target: MonthRef, today: Date): WeekRef {
  if (target.year === today.getFullYear() && target.month === today.getMonth()) {
    const current = getWeekRef(today);
    const own = monthOfWeek(current);
    if (own.year === target.year && own.month === target.month) return current;
  }
  // The 4th's week always has its Thursday (1st–7th) in the month.
  return getWeekRef(new Date(target.year, target.month, 4));
}

/** Whole weeks from `from` to `to`. */
export function weeksBetween(from: WeekRef, to: WeekRef): number {
  return daysBetween(getISOWeekRange(from.week, from.year).start, getISOWeekRange(to.week, to.year).start) / 7;
}
