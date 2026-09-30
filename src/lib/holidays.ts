import type {
  Dataset,
  DatedSchoolHoliday,
  FlagDay,
  SchoolHolidayType,
  UndatedSchoolHoliday,
} from "../data/types";
import { daysBetween, getISOWeekRange, parseISODate, startOfDay, toISODate } from "./week";

export type UpcomingHoliday =
  | { kind: "upcoming"; period: DatedSchoolHoliday; start: Date; end: Date; daysUntil: number }
  | { kind: "ongoing"; period: DatedSchoolHoliday; start: Date; end: Date }
  | { kind: "undated"; period: UndatedSchoolHoliday };

// The weeks a holiday type always falls in. Used only to order an undated
// period against dated ones and to drop it once it must be over; it is never
// shown as a date.
const TYPICAL_WEEKS: Record<SchoolHolidayType, readonly [number, number]> = {
  hiihtoloma: [8, 10],
  syysloma: [42, 43],
};

export function nextSchoolHoliday(
  schoolHolidays: Dataset["schoolHolidays"],
  city: string,
  today: Date,
): UpcomingHoliday | null {
  const day = startOfDay(today);
  const candidates: { sortKey: number; holiday: UpcomingHoliday }[] = [];

  for (const period of schoolHolidays.dated) {
    if (!period.cities.includes(city)) continue;
    const start = parseISODate(period.start);
    const end = parseISODate(period.end);
    if (!start || !end || end < day) continue;
    candidates.push({
      sortKey: start.getTime(),
      holiday:
        start <= day
          ? { kind: "ongoing", period, start, end }
          : { kind: "upcoming", period, start, end, daysUntil: daysBetween(day, start) },
    });
  }

  for (const period of schoolHolidays.undated) {
    if (!period.cities.includes(city)) continue;
    const [firstWeek, lastWeek] = TYPICAL_WEEKS[period.type];
    if (getISOWeekRange(lastWeek, period.year).end < day) continue;
    candidates.push({
      sortKey: getISOWeekRange(firstWeek, period.year).start.getTime(),
      holiday: { kind: "undated", period },
    });
  }

  candidates.sort((a, b) => a.sortKey - b.sortKey);
  return candidates[0]?.holiday ?? null;
}

/** The dated school holiday `city` is on during `date`, if any. */
export function schoolHolidayOn(
  schoolHolidays: Dataset["schoolHolidays"],
  city: string,
  date: Date,
): DatedSchoolHoliday | null {
  const key = toISODate(date);
  return schoolHolidays.dated.find((period) => period.cities.includes(city) && period.start <= key && key <= period.end) ?? null;
}

export function flagDaysOn(flagDays: FlagDay[], date: Date): FlagDay[] {
  const key = toISODate(date);
  return flagDays.filter((day) => day.date === key);
}

export function nameDaysOn(nameDays: Dataset["nameDays"], date: Date): string[] {
  return nameDays?.byDate[toISODate(date).slice(5)] ?? [];
}

export const STALE_AFTER_DAYS = 120;

export function isDataStale(generatedAt: string, today: Date): boolean {
  const generated = parseISODate(generatedAt);
  return generated === null || daysBetween(generated, today) > STALE_AFTER_DAYS;
}
