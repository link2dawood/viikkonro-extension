import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, weekCopyText } from "./clipboard";

describe("weekCopyText", () => {
  it("formats the week with its dates", () => {
    expect(weekCopyText({ week: 42, year: 2026 }, "fi")).toBe("Viikko 42 (12.–18.10.2026)");
    expect(weekCopyText({ week: 53, year: 2026 }, "fi")).toBe("Viikko 53 (28.12.2026–3.1.2027)");
    expect(weekCopyText({ week: 42, year: 2026 }, "en")).toMatch(/^Week 42 \(12\s*–\s*18 Oct 2026\)$/);
  });

  it("follows the chosen format", () => {
    const week5 = { week: 5, year: 2027 };
    expect(weekCopyText(week5, "fi", "iso")).toBe("2027-W05");
    expect(weekCopyText({ week: 53, year: 2026 }, "en", "iso")).toBe("2026-W53");
    expect(weekCopyText(week5, "fi", "short")).toBe("vk 5");
    expect(weekCopyText(week5, "en", "short")).toBe("wk 5");
    expect(weekCopyText(week5, "fi", "dates")).toBe("1.–7.2.2027");
    expect(weekCopyText(week5, "fi", "text")).toBe("Viikko 5 (1.–7.2.2027)");
  });
});

describe("copyToClipboard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports success and failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyToClipboard("Viikko 42")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Viikko 42");

    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await expect(copyToClipboard("Viikko 42")).resolves.toBe(false);
  });
});
