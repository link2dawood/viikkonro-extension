import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, weekCopyText } from "./clipboard";

describe("weekCopyText", () => {
  it("formats the week with its dates", () => {
    expect(weekCopyText({ week: 42, year: 2026 }, "fi")).toBe("Viikko 42 (12.–18.10.2026)");
    expect(weekCopyText({ week: 53, year: 2026 }, "fi")).toBe("Viikko 53 (28.12.2026–3.1.2027)");
    expect(weekCopyText({ week: 42, year: 2026 }, "en")).toMatch(/^Week 42 \(12\s*–\s*18 Oct 2026\)$/);
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
