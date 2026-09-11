import { describe, expect, it } from "vitest";
import { hasWeekPage, sitePath, siteUrl } from "./site";

describe("siteUrl", () => {
  it("tags every link with the extension UTM parameters", () => {
    expect(siteUrl(sitePath.week(42, 2026), "popup")).toBe(
      "https://viikkonro.fi/viikko-42-2026?utm_source=extension&utm_medium=referral&utm_campaign=popup",
    );
  });

  it("keeps anchors after the query string", () => {
    expect(siteUrl(sitePath.flagDays(2026), "popup", "aleksis-kiven-paiva")).toBe(
      "https://viikkonro.fi/liputuspaivat-2026?utm_source=extension&utm_medium=referral&utm_campaign=popup#aleksis-kiven-paiva",
    );
  });
});

describe("hasWeekPage", () => {
  it("mirrors the site's prerender window", () => {
    const today = new Date(2026, 8, 11);
    expect(hasWeekPage(2019, today)).toBe(false);
    expect(hasWeekPage(2020, today)).toBe(true);
    expect(hasWeekPage(2035, today)).toBe(true);
    expect(hasWeekPage(2036, today)).toBe(false);
  });
});
