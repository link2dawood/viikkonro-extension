import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import dataset from "../../src/data/generated/dataset.json";

const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8").trim();

describe.each(["fi", "en", "sv"])("store listing (%s)", (lang) => {
  const summary = read(`${lang}/summary.txt`);
  const description = read(`${lang}/description.txt`);

  it("fits every store's limits", () => {
    expect(summary.length).toBeLessThanOrEqual(250); // AMO summary
    expect(description.length).toBeGreaterThanOrEqual(250); // Edge minimum
    expect(description.length).toBeLessThanOrEqual(10_000); // Edge maximum (CWS allows 16,000)
  });

  // The Chrome Web Store rejected a version that listed every supported city
  // as "excessive keywords" (violation Yellow Argon). Coverage is a count.
  it("contains no keyword lists", () => {
    const cityNames = dataset.schoolHolidays.cities.filter((city) => (summary + description).includes(city));
    expect(cityNames).toEqual([]);
    for (const line of description.split("\n")) expect(line.split(",").length).toBeLessThan(5);
  });

  it("states the city count the extension ships", () => {
    const match = /(\d+) (suomalaista kaupunkia|Finnish cities|finländska städer)/.exec(description);
    expect(Number(match?.[1])).toBe(dataset.schoolHolidays.cities.length);
  });
});
