import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import dataset from "../../src/data/generated/dataset.json";

const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8").trim();

describe.each(["fi", "en"])("store listing (%s)", (lang) => {
  const summary = read(`${lang}/summary.txt`);
  const description = read(`${lang}/description.txt`);

  it("fits every store's limits", () => {
    expect(summary.length).toBeLessThanOrEqual(250); // AMO summary
    expect(description.length).toBeGreaterThanOrEqual(250); // Edge minimum
    expect(description.length).toBeLessThanOrEqual(10_000); // Edge maximum (CWS allows 16,000)
  });

  it("names every city the extension ships, and no stale count", () => {
    for (const city of dataset.schoolHolidays.cities) expect(description).toContain(city);
    expect(summary + description).not.toMatch(/\b(?!21\b)\d{2} (kaupunki|cities)/);
  });
});
