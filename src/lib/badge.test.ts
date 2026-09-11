import { describe, expect, it } from "vitest";
import { badgeText, computeBadgeState } from "./badge";

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
    expect(computeBadgeState(new Date(2026, 9, 14, 9), "number", "fi")).toEqual({
      date: "2026-10-14",
      text: "42",
      title: "Viikko 42 · 12.–18.10.2026",
    });
    expect(computeBadgeState(new Date(2027, 0, 1), "number", "fi").title).toBe("Viikko 53 · 28.12.2026–3.1.2027");
  });
});
