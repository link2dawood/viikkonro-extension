import { describe, expect, it } from "vitest";
import { monthGrid, monthOfWeek, shiftMonth, weekForMonth, weeksBetween } from "./calendar";
import { toISODate } from "./week";

describe("monthOfWeek", () => {
  it("follows the week's Thursday", () => {
    expect(monthOfWeek({ week: 40, year: 2026 })).toEqual({ year: 2026, month: 9 }); // 28.9.–4.10., Thu 1.10.
    expect(monthOfWeek({ week: 39, year: 2026 })).toEqual({ year: 2026, month: 8 });
    expect(monthOfWeek({ week: 53, year: 2026 })).toEqual({ year: 2026, month: 11 }); // Thu 31.12.
    expect(monthOfWeek({ week: 1, year: 2027 })).toEqual({ year: 2027, month: 0 });
  });
});

describe("shiftMonth", () => {
  it("rolls over years", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("monthGrid", () => {
  it("covers the month in Monday-first rows", () => {
    const rows = monthGrid({ year: 2026, month: 9 });
    expect(rows.map((row) => row.ref.week)).toEqual([40, 41, 42, 43, 44]);
    expect(toISODate(rows[0]!.days[0]!)).toBe("2026-09-28");
    expect(toISODate(rows.at(-1)!.days[6]!)).toBe("2026-11-01");
    expect(rows.every((row) => row.days.length === 7 && row.days[0]!.getDay() === 1)).toBe(true);
  });

  it("spans a week-year boundary", () => {
    expect(monthGrid({ year: 2027, month: 0 }).map((row) => `${row.ref.week}/${row.ref.year}`)).toEqual([
      "53/2026",
      "1/2027",
      "2/2027",
      "3/2027",
      "4/2027",
    ]);
  });

  it("has 4 to 6 rows every month", () => {
    for (let year = 2024; year <= 2030; year++) {
      for (let month = 0; month < 12; month++) {
        const count = monthGrid({ year, month }).length;
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("weekForMonth", () => {
  const today = new Date(2026, 8, 30); // Wed, week 40 (Thursday in October)

  it("picks the month's first week", () => {
    expect(weekForMonth({ year: 2026, month: 10 }, today)).toEqual({ week: 45, year: 2026 });
    expect(weekForMonth({ year: 2027, month: 0 }, today)).toEqual({ week: 1, year: 2027 });
    // Today's week belongs to October, so September gets its own first week.
    expect(weekForMonth({ year: 2026, month: 8 }, today)).toEqual({ week: 36, year: 2026 });
  });

  it("picks today's week in today's month", () => {
    expect(weekForMonth({ year: 2026, month: 8 }, new Date(2026, 8, 16))).toEqual({ week: 38, year: 2026 });
  });

  it("always lands in the target month", () => {
    for (let month = 0; month < 24; month++) {
      const target = shiftMonth({ year: 2026, month: 0 }, month);
      expect(monthOfWeek(weekForMonth(target, today))).toEqual(target);
    }
  });
});

describe("weeksBetween", () => {
  it("counts across years", () => {
    expect(weeksBetween({ week: 40, year: 2026 }, { week: 42, year: 2026 })).toBe(2);
    expect(weeksBetween({ week: 52, year: 2026 }, { week: 1, year: 2027 })).toBe(2);
    expect(weeksBetween({ week: 1, year: 2027 }, { week: 52, year: 2026 })).toBe(-2);
  });
});
