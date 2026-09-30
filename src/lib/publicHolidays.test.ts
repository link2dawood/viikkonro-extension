import { describe, expect, it } from "vitest";
import {
  easterSunday,
  findPublicHolidays,
  nextPublicHoliday,
  publicHolidays,
  publicHolidaysOn,
  weekWorkdays,
  workdaysBetween,
  workdaysText,
} from "./publicHolidays";
import { toISODate } from "./week";

describe("easterSunday", () => {
  it.each([
    [2008, "2008-03-23"],
    [2019, "2019-04-21"],
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2038, "2038-04-25"],
  ])("%i → %s", (year, expected) => {
    expect(toISODate(easterSunday(year))).toBe(expected);
  });
});

describe("publicHolidays", () => {
  const table = (year: number) =>
    Object.fromEntries(publicHolidays(year).map((holiday) => [holiday.key, toISODate(holiday.date)]));

  it("lists 2026 in date order", () => {
    expect(publicHolidays(2026).map((holiday) => toISODate(holiday.date))).toEqual([
      "2026-01-01",
      "2026-01-06",
      "2026-04-03",
      "2026-04-05",
      "2026-04-06",
      "2026-05-01",
      "2026-05-14",
      "2026-05-24",
      "2026-06-19",
      "2026-06-20",
      "2026-10-31",
      "2026-12-06",
      "2026-12-24",
      "2026-12-25",
      "2026-12-26",
    ]);
  });

  it("moves Juhannus and Pyhäinpäivä to the right Saturday", () => {
    // 20 June 2027 and 31 October 2027 are Sundays: both land at the end of their window.
    expect(table(2027)).toMatchObject({
      goodFriday: "2027-03-26",
      easterMonday: "2027-03-29",
      ascension: "2027-05-06",
      whitSunday: "2027-05-16",
      midsummerEve: "2027-06-25",
      midsummerDay: "2027-06-26",
      allSaints: "2027-11-06",
    });
  });

  it("keeps Juhannus on a Saturday between 20 and 26 June every year", () => {
    for (let year = 2020; year <= 2040; year++) {
      const holidays = publicHolidays(year);
      const day = holidays.find((holiday) => holiday.key === "midsummerDay")!.date;
      const saints = holidays.find((holiday) => holiday.key === "allSaints")!.date;
      expect(day.getDay()).toBe(6);
      expect(day.getMonth() === 5 && day.getDate() >= 20 && day.getDate() <= 26).toBe(true);
      expect(saints.getDay()).toBe(6);
      expect(toISODate(saints) >= `${year}-10-31` && toISODate(saints) <= `${year}-11-06`).toBe(true);
    }
  });

  it("marks only the eves as unofficial", () => {
    expect(publicHolidays(2026).filter((holiday) => !holiday.official).map((holiday) => holiday.key)).toEqual([
      "midsummerEve",
      "christmasEve",
    ]);
  });
});

describe("publicHolidaysOn", () => {
  it("finds the day's holiday", () => {
    expect(publicHolidaysOn(new Date(2026, 11, 6)).map((holiday) => holiday.key)).toEqual(["independence"]);
    expect(publicHolidaysOn(new Date(2026, 11, 7))).toEqual([]);
  });
});

describe("nextPublicHoliday", () => {
  it("counts whole days to the next holiday, never today's", () => {
    const next = nextPublicHoliday(new Date(2026, 8, 30, 15, 30));
    expect(next.holiday.key).toBe("allSaints");
    expect(next.daysUntil).toBe(31);
    expect(nextPublicHoliday(new Date(2026, 11, 6)).holiday.key).toBe("christmasEve");
  });

  it("rolls over the year", () => {
    const next = nextPublicHoliday(new Date(2026, 11, 26));
    expect(toISODate(next.holiday.date)).toBe("2027-01-01");
    expect(next.daysUntil).toBe(6);
  });
});

describe("workdays", () => {
  it.each<[number, number, number, string[]]>([
    [42, 2026, 5, []],
    [14, 2026, 4, ["goodFriday", "easterSunday"]],
    [15, 2026, 4, ["easterMonday"]],
    [20, 2026, 4, ["ascension"]],
    [25, 2026, 4, ["midsummerEve", "midsummerDay"]],
    [44, 2026, 5, ["allSaints"]],
    [49, 2026, 5, ["independence"]],
    [52, 2026, 3, ["christmasEve", "christmasDay", "boxingDay"]],
    [53, 2026, 4, ["newYear"]],
    [1, 2027, 4, ["epiphany"]],
  ])("week %i/%i has %i working days", (week, year, workdays, keys) => {
    const result = weekWorkdays({ week, year });
    expect(result.workdays).toBe(workdays);
    expect(result.holidays.map((holiday) => holiday.key)).toEqual(keys);
  });

  it("counts inclusive ranges across a year change", () => {
    expect(workdaysBetween(new Date(2026, 11, 21), new Date(2027, 0, 10))).toBe(3 + 4 + 4);
    expect(workdaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 12))).toBe(1);
    expect(workdaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 11))).toBe(0);
  });

  it("has singular and plural text", () => {
    expect(workdaysText(1, "fi")).toBe("1 työpäivä");
    expect(workdaysText(3, "fi")).toBe("3 työpäivää");
    expect(workdaysText(1, "en")).toBe("1 working day");
    expect(workdaysText(4, "en")).toBe("4 working days");
  });
});

describe("findPublicHolidays", () => {
  const today = new Date(2026, 8, 30);
  const keys = (query: string, year?: number) => findPublicHolidays(query, today, year).map((h) => h.key);
  const dates = (query: string, year?: number) =>
    findPublicHolidays(query, today, year).map((h) => toISODate(h.date));

  it("puts an exact name before names it prefixes", () => {
    expect(keys("juhannus")).toEqual(["midsummerDay", "midsummerEve"]);
    expect(keys("joulu")).toEqual(["christmasDay", "christmasEve"]);
    expect(keys("christmas")).toEqual(["christmasDay", "christmasEve"]);
    expect(keys("easter")).toEqual(["easterSunday", "easterMonday"]);
  });

  it("matches prefixes, case and ä/ö folding in either language", () => {
    expect(keys("Itsenäisyys")).toEqual(["independence"]);
    expect(keys("paasiainen")).toEqual(["easterSunday"]);
    expect(keys("pyhainpaiva")).toEqual(["allSaints"]);
    expect(keys("vappu")).toEqual(["mayDay"]);
    expect(keys("midsummer eve")).toEqual(["midsummerEve"]);
  });

  it("resolves to the next occurrence unless a year is given", () => {
    expect(dates("pyhäinpäivä")).toEqual(["2026-10-31"]);
    expect(dates("juhannus")).toEqual(["2027-06-26", "2027-06-25"]);
    expect(dates("juhannus", 2026)).toEqual(["2026-06-20", "2026-06-19"]);
  });

  it("ignores short or unknown queries", () => {
    expect(keys("jo")).toEqual([]);
    expect(keys("abc")).toEqual([]);
    expect(keys("")).toEqual([]);
  });
});
