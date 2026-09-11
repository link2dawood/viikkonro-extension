import { describe, expect, it } from "vitest";
import en from "../../public/_locales/en/messages.json";
import fi from "../../public/_locales/fi/messages.json";
import { resolveLang, t } from "./i18n";

type Catalog = Record<string, { message: string; placeholders?: Record<string, unknown> }>;

describe("message catalogs", () => {
  it("define the same keys and placeholders in both languages", () => {
    const shape = (catalog: Catalog) =>
      Object.fromEntries(Object.entries(catalog).map(([key, entry]) => [key, Object.keys(entry.placeholders ?? {})]));
    expect(shape(en)).toEqual(shape(fi));
  });

  it("stay within Chrome Web Store manifest limits", () => {
    for (const catalog of [fi, en]) {
      expect(catalog.extName.message.length).toBeLessThanOrEqual(75);
      expect(catalog.extShortName.message.length).toBeLessThanOrEqual(12);
      expect(catalog.extDescription.message.length).toBeLessThanOrEqual(132);
    }
  });
});

describe("t", () => {
  it("substitutes placeholders like i18n.getMessage", () => {
    expect(t("fi", "weekOfTotal", 37, 53)).toBe("Viikko 37 / 53");
    expect(t("en", "holidayStartsInDays", 31)).toBe("starts in 31 days");
  });
});

describe("resolveLang", () => {
  it("follows the browser unless a language is chosen", () => {
    expect(resolveLang("auto", "fi")).toBe("fi");
    expect(resolveLang("auto", "en-US")).toBe("en");
    expect(resolveLang("auto", "sv-FI")).toBe("fi");
    expect(resolveLang("en", "fi")).toBe("en");
    expect(resolveLang("fi", "en-GB")).toBe("fi");
  });
});
