import { describe, expect, it } from "vitest";
import type { Dataset } from "../data/types";
import { flagDaysOn, isDataStale, nameDaysOn, nextSchoolHoliday, schoolHolidayOn } from "./holidays";

const sourceUrl = "https://example.test/source";

// A fixture rather than the generated dataset, so these tests don't change
// meaning every time the data is re-synced.
const schoolHolidays: Dataset["schoolHolidays"] = {
  years: [2026, 2027],
  cities: ["Espoo", "Helsinki", "Kotka"],
  dated: [
    { type: "syysloma", year: 2026, week: 42, start: "2026-10-12", end: "2026-10-16", cities: ["Espoo", "Helsinki"], confidence: "confirmed", sourceUrl },
    { type: "syysloma", year: 2026, week: 43, start: "2026-10-19", end: "2026-10-25", cities: ["Kotka"], confidence: "confirmed", sourceUrl },
    { type: "hiihtoloma", year: 2027, week: 8, start: "2027-02-22", end: "2027-02-26", cities: ["Espoo", "Helsinki"], confidence: "estimated", sourceUrl },
    { type: "syysloma", year: 2027, week: 42, start: "2027-10-18", end: "2027-10-22", cities: ["Helsinki"], confidence: "confirmed", sourceUrl },
  ],
  undated: [{ type: "syysloma", year: 2027, cities: ["Espoo", "Kotka"], confidence: "unknown" }],
};

describe("schoolHolidayOn", () => {
  it("finds the city's holiday on a day, ends inclusive", () => {
    expect(schoolHolidayOn(schoolHolidays, "Helsinki", new Date(2026, 9, 12))?.week).toBe(42);
    expect(schoolHolidayOn(schoolHolidays, "Helsinki", new Date(2026, 9, 16))?.week).toBe(42);
    expect(schoolHolidayOn(schoolHolidays, "Helsinki", new Date(2026, 9, 17))).toBeNull();
    expect(schoolHolidayOn(schoolHolidays, "Kotka", new Date(2026, 9, 12))).toBeNull();
    expect(schoolHolidayOn(schoolHolidays, "Kotka", new Date(2026, 9, 25))?.week).toBe(43);
  });
});

describe("nextSchoolHoliday", () => {
  it("counts down to the next dated holiday", () => {
    const next = nextSchoolHoliday(schoolHolidays, "Helsinki", new Date(2026, 8, 11));
    expect(next).toMatchObject({ kind: "upcoming", daysUntil: 31, period: { type: "syysloma", year: 2026 } });
  });

  it("uses the city's own week", () => {
    expect(nextSchoolHoliday(schoolHolidays, "Kotka", new Date(2026, 9, 14))).toMatchObject({
      kind: "upcoming",
      daysUntil: 5,
      period: { week: 43 },
    });
  });

  it("reports a holiday in progress through its last day", () => {
    expect(nextSchoolHoliday(schoolHolidays, "Helsinki", new Date(2026, 9, 12, 8))?.kind).toBe("ongoing");
    expect(nextSchoolHoliday(schoolHolidays, "Helsinki", new Date(2026, 9, 16, 23))?.kind).toBe("ongoing");
  });

  it("moves on once a holiday has ended, carrying its confidence tier", () => {
    const next = nextSchoolHoliday(schoolHolidays, "Helsinki", new Date(2026, 9, 17));
    expect(next).toMatchObject({ kind: "upcoming", period: { type: "hiihtoloma", confidence: "estimated" } });
  });

  it("falls back to an undated period without inventing a date", () => {
    expect(nextSchoolHoliday(schoolHolidays, "Espoo", new Date(2027, 2, 1))).toEqual({
      kind: "undated",
      period: schoolHolidays.undated[0],
    });
    // Helsinki has a confirmed date for the same holiday.
    expect(nextSchoolHoliday(schoolHolidays, "Helsinki", new Date(2027, 2, 1))).toMatchObject({ kind: "upcoming" });
  });

  it("drops an undated period once it must be over", () => {
    expect(nextSchoolHoliday(schoolHolidays, "Espoo", new Date(2027, 9, 31))?.kind).toBe("undated");
    expect(nextSchoolHoliday(schoolHolidays, "Espoo", new Date(2027, 10, 1))).toBeNull();
  });

  it("returns null for a city without data", () => {
    expect(nextSchoolHoliday(schoolHolidays, "Rovaniemi", new Date(2026, 8, 11))).toBeNull();
  });
});

describe("flagDaysOn / nameDaysOn", () => {
  const flagDays = [
    { date: "2026-10-10", name: "Aleksis Kiven päivä", altName: null, slug: "aleksis-kiven-paiva" },
    { date: "2027-10-10", name: "Aleksis Kiven päivä", altName: null, slug: "aleksis-kiven-paiva" },
  ];

  it("matches the exact calendar date", () => {
    expect(flagDaysOn(flagDays, new Date(2026, 9, 10, 18))).toEqual([flagDays[0]]);
    expect(flagDaysOn(flagDays, new Date(2026, 9, 11))).toEqual([]);
  });

  it("returns no name days until they are bundled", () => {
    expect(nameDaysOn(null, new Date(2026, 0, 2))).toEqual([]);
    const nameDays = { attribution: null, sourceUrl: null, byDate: { "01-02": ["Aapeli"] } };
    expect(nameDaysOn(nameDays, new Date(2027, 0, 2))).toEqual(["Aapeli"]);
  });
});

describe("isDataStale", () => {
  it("flags data older than 120 days", () => {
    expect(isDataStale("2026-09-11", new Date(2027, 0, 9))).toBe(false);
    expect(isDataStale("2026-09-11", new Date(2027, 0, 10))).toBe(true);
    expect(isDataStale("not a date", new Date(2026, 8, 11))).toBe(true);
  });
});
