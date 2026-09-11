import { describe, expect, it } from "vitest";
import { assertDatasetCoverage, missingDatasetYears } from "./coverage";
import { dataset } from "./dataset";
import { parseISODate } from "../lib/week";

const generatedAt = parseISODate(dataset.generatedAt);

describe("generated dataset", () => {
  it("has a valid generation date", () => {
    expect(generatedAt).not.toBeNull();
  });

  it("covered the current and next year when it was generated", () => {
    expect(missingDatasetYears(dataset, generatedAt ?? new Date())).toEqual([]);
  });

  it("has well-formed school holiday periods", () => {
    const { cities, dated, undated } = dataset.schoolHolidays;
    for (const period of dated) {
      const start = parseISODate(period.start);
      const end = parseISODate(period.end);
      expect(start && end && start <= end, `${period.type} ${period.year} w${period.week}`).toBe(true);
      expect(["confirmed", "estimated"]).toContain(period.confidence);
      expect(period.sourceUrl).toMatch(/^https:\/\//);
    }
    for (const period of [...dated, ...undated]) {
      for (const city of period.cities) expect(cities).toContain(city);
    }
  });

  it("does not bundle name days while the site's calendar is incomplete", () => {
    // Flip this expectation deliberately once licensing clears.
    expect(dataset.nameDays).toBeNull();
  });
});

describe("assertDatasetCoverage", () => {
  it("names the missing years", () => {
    const later = new Date((generatedAt ?? new Date()).getFullYear() + 1, 0, 1);
    expect(() => assertDatasetCoverage(dataset, later)).toThrow(/school holidays \d{4}.*flag days \d{4}/);
  });
});
