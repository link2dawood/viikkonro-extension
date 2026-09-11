import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  getISOWeek,
  getISOWeekRange,
  getISOWeekYear,
  getWeeksInISOYear,
  isValidWeek,
  makeDate,
  msUntilNextMidnight,
  parseISODate,
  shiftWeek,
  toISODate,
} from "./week";

// Independent textbook algorithm on UTC dates, so the implementation isn't
// only checked against itself.
function referenceWeek(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  return { week: Math.ceil(((utc.getTime() - yearStart) / 86_400_000 + 1) / 7), year: utc.getUTCFullYear() };
}

function date(value: string): Date {
  const parsed = parseISODate(value);
  if (!parsed) throw new Error(`bad fixture ${value}`);
  return parsed;
}

describe("getISOWeek / getISOWeekYear", () => {
  it("matches the reference for every day from 2024 through 2035", () => {
    for (let day = new Date(2023, 11, 25); day < new Date(2036, 0, 8); day = addDays(day, 1)) {
      expect({ week: getISOWeek(day), year: getISOWeekYear(day) }, toISODate(day)).toEqual(referenceWeek(day));
    }
  });

  it.each([
    ["2024-01-01", 1, 2024],
    ["2024-12-29", 52, 2024],
    ["2024-12-30", 1, 2025],
    ["2025-12-28", 52, 2025],
    ["2025-12-29", 1, 2026],
    ["2026-09-11", 37, 2026],
    ["2026-12-31", 53, 2026],
    ["2027-01-03", 53, 2026],
    ["2027-01-04", 1, 2027],
    ["2032-12-31", 53, 2032],
    ["2033-01-02", 53, 2032],
    ["2033-01-03", 1, 2033],
  ])("%s is week %i of %i", (value, week, year) => {
    expect(getISOWeek(date(value))).toBe(week);
    expect(getISOWeekYear(date(value))).toBe(year);
  });

  it("ignores the time of day", () => {
    expect(getISOWeek(new Date(2026, 11, 31, 23, 59, 59))).toBe(53);
  });
});

describe("getWeeksInISOYear", () => {
  it("finds exactly the 53-week years between 2024 and 2035", () => {
    const years = Array.from({ length: 12 }, (_, i) => 2024 + i);
    expect(years.filter((year) => getWeeksInISOYear(year) === 53)).toEqual([2026, 2032]);
  });
});

describe("getISOWeekRange", () => {
  it.each([
    [42, 2026, "2026-10-12", "2026-10-18"],
    [1, 2025, "2024-12-30", "2025-01-05"],
    [53, 2026, "2026-12-28", "2027-01-03"],
    [1, 2027, "2027-01-04", "2027-01-10"],
    [13, 2026, "2026-03-23", "2026-03-29"],
  ])("week %i of %i is %s to %s", (week, year, start, end) => {
    const range = getISOWeekRange(week, year);
    expect(toISODate(range.start)).toBe(start);
    expect(toISODate(range.end)).toBe(end);
  });

  it("round-trips every week of 2024 through 2035 as Monday to Sunday", () => {
    for (let year = 2024; year <= 2035; year++) {
      for (let week = 1; week <= getWeeksInISOYear(year); week++) {
        const { start, end } = getISOWeekRange(week, year);
        expect([start.getDay(), end.getDay()]).toEqual([1, 0]);
        expect([getISOWeek(start), getISOWeekYear(start)]).toEqual([week, year]);
        expect([getISOWeek(end), getISOWeekYear(end)]).toEqual([week, year]);
      }
    }
  });
});

describe("isValidWeek", () => {
  it.each([
    [1, 2026, true],
    [53, 2026, true],
    [53, 2027, false],
    [0, 2026, false],
    [54, 2032, false],
    [1.5, 2026, false],
  ])("week %s of %i → %s", (week, year, valid) => {
    expect(isValidWeek(week, year)).toBe(valid);
  });
});

describe("shiftWeek", () => {
  it("rolls across week-year boundaries", () => {
    expect(shiftWeek({ week: 53, year: 2026 }, 1)).toEqual({ week: 1, year: 2027 });
    expect(shiftWeek({ week: 1, year: 2025 }, -1)).toEqual({ week: 52, year: 2024 });
    expect(shiftWeek({ week: 52, year: 2024 }, 1)).toEqual({ week: 1, year: 2025 });
    expect(shiftWeek({ week: 37, year: 2026 }, 0)).toEqual({ week: 37, year: 2026 });
  });
});

describe("date helpers", () => {
  it("counts calendar days across DST changes", () => {
    expect(toISODate(addDays(date("2026-03-28"), 1))).toBe("2026-03-29");
    expect(daysBetween(date("2026-03-28"), date("2026-03-30"))).toBe(2);
    expect(daysBetween(date("2026-10-24"), date("2026-10-26"))).toBe(2);
  });

  it("rejects dates that roll over", () => {
    expect(parseISODate("2026-02-30")).toBeNull();
    expect(parseISODate("2026-2-3")).toBeNull();
    expect(parseISODate("2024-02-29")).not.toBeNull();
    expect(makeDate(2026, 2, 31)).toBeNull();
    expect(makeDate(26, 1, 1)).toBeNull();
  });

  it("finds the next local midnight on DST days", () => {
    expect(msUntilNextMidnight(new Date(2026, 2, 28, 23, 0))).toBe(3_600_000);
    // 29 March 2026 is 23 hours long in Helsinki.
    expect(msUntilNextMidnight(new Date(2026, 2, 29, 0, 30))).toBe(22.5 * 3_600_000);
  });
});
