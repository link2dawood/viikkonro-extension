import { describe, expect, it } from "vitest";
import type { Dataset } from "../data/types";
import { BADGE_COLORS, BADGE_HIGHLIGHTS, badgeHighlightFor, badgeText, computeBadgeState, type BadgeOptions } from "./badge";

const plain: BadgeOptions = { badgeFormat: "number", badgeHighlight: true, city: null };

// A fixture, so re-syncing the real data never changes these tests.
const data: Pick<Dataset, "flagDays" | "schoolHolidays"> = {
  flagDays: [{ date: "2026-10-10", name: "Aleksis Kiven päivä", altName: null, slug: "aleksis-kivi" }],
  schoolHolidays: {
    years: [2026],
    cities: ["Helsinki"],
    dated: [
      {
        type: "syysloma",
        year: 2026,
        week: 42,
        start: "2026-10-12",
        end: "2026-10-16",
        cities: ["Helsinki"],
        confidence: "confirmed",
        sourceUrl: "https://example.test",
      },
    ],
    undated: [],
  },
};

describe("badge", () => {
  it("shows the week without a leading zero", () => {
    expect(badgeText(5, "number", "fi")).toBe("5");
    expect(badgeText(42, "prefixed", "fi")).toBe("vk42");
    expect(badgeText(42, "prefixed", "en")).toBe("wk42");
  });

  it("never exceeds Chrome's 4-character badge limit", () => {
    for (let week = 1; week <= 53; week++) {
      for (const lang of ["fi", "en"] as const) {
        expect(badgeText(week, "prefixed", lang).length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("builds the tooltip from the week's range", () => {
    expect(computeBadgeState(new Date(2026, 9, 14, 9), plain, "fi", data)).toEqual({
      date: "2026-10-14",
      text: "42",
      title: "Viikko 42 · 12.–18.10.2026",
      background: BADGE_COLORS.background,
      textColor: BADGE_COLORS.text,
    });
    expect(computeBadgeState(new Date(2027, 0, 1), plain, "fi", data).title).toBe("Viikko 53 · 28.12.2026–3.1.2027");
  });
});

describe("badge highlight", () => {
  it("marks public holidays, flag days and the city's school holidays", () => {
    expect(badgeHighlightFor(new Date(2026, 11, 6), null, data)).toBe("publicHoliday");
    expect(badgeHighlightFor(new Date(2026, 11, 24), null, data)).toBe("publicHoliday");
    expect(badgeHighlightFor(new Date(2026, 9, 10), null, data)).toBe("flagDay");
    expect(badgeHighlightFor(new Date(2026, 9, 13), "Helsinki", data)).toBe("schoolHoliday");
    expect(badgeHighlightFor(new Date(2026, 9, 13), null, data)).toBeNull();
    expect(badgeHighlightFor(new Date(2026, 9, 13), "Oulu", data)).toBeNull();
    expect(badgeHighlightFor(new Date(2026, 9, 14), null, data)).toBeNull();
  });

  it("recolours the badge unless turned off", () => {
    const holiday = new Date(2026, 11, 6, 12);
    expect(computeBadgeState(holiday, plain, "fi", data)).toMatchObject({
      background: BADGE_HIGHLIGHTS.publicHoliday.background,
      textColor: BADGE_HIGHLIGHTS.publicHoliday.text,
    });
    expect(computeBadgeState(holiday, { ...plain, badgeHighlight: false }, "fi", data).background).toBe(
      BADGE_COLORS.background,
    );
  });

  it("keeps every highlight colour pair readable", () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const { background, text } of Object.values(BADGE_HIGHLIGHTS)) {
      const [light, dark] = [luminance(background), luminance(text)].sort((a, b) => b - a) as [number, number];
      expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
