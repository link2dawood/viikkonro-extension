import { describe, expect, it } from "vitest";
import { buildSuggestions, MAX_SUGGESTIONS, omniboxTargetUrl, parseOmniboxInput } from "./omnibox";

const today = new Date(2026, 8, 11); // Friday of week 37/2026

describe("parseOmniboxInput", () => {
  it.each<[string, [number, number][]]>([
    ["", [[37, 2026], [38, 2026], [36, 2026]]],
    ["42", [[42, 2026], [42, 2027], [42, 2025]]],
    ["53", [[53, 2026]]],
    ["42 2027", [[42, 2027]]],
    ["  42   2027 ", [[42, 2027]]],
    ["42/2027", [[42, 2027]]],
    ["2026-W42", [[42, 2026]]],
    ["2026w5", [[5, 2026]]],
    ["13.10.2026", [[42, 2026]]],
    ["13.10.", [[42, 2026]]],
    ["2026-10-13", [[42, 2026]]],
    ["31.12.2026", [[53, 2026]]],
    ["1.1.2027", [[53, 2026]]],
    ["42 2035", [[42, 2035]]],
  ])("%j resolves", (input, expected) => {
    expect(parseOmniboxInput(input, today)).toEqual(expected.map(([week, year]) => ({ week, year })));
  });

  it.each(["0", "54", "53 2027", "31.2.2026", "2026-02-30", "42 2019", "42 2036", "abc", "4 2"])(
    "%j is not a valid week",
    (input) => {
      expect(parseOmniboxInput(input, today)).toEqual([]);
    },
  );
});

describe("buildSuggestions", () => {
  it("puts the best match in the default suggestion and the rest below", () => {
    const result = buildSuggestions("42", today, "fi");
    expect(result.defaultDescription).toBe("Viikko 42: 12.–18.10.2026");
    expect(result.suggestions.map((s) => s.content)).toEqual(["42 2027", "42 2025"]);
    expect(result.suggestions[0]?.description).toBe("Viikko 42: 18.–24.10.2027");
  });

  it("gives a single non-actionable line for invalid input", () => {
    expect(buildSuggestions("54", today, "fi")).toEqual({ defaultDescription: "Ei kelvollinen viikko", suggestions: [] });
    expect(buildSuggestions("54", today, "en").defaultDescription).toBe("Not a valid week");
  });

  it("uses the chosen language", () => {
    expect(buildSuggestions("42", today, "en").defaultDescription).toMatch(/^Week 42: 12\s*–\s*18 Oct 2026$/);
  });

  it("never exceeds the suggestion cap or repeats the typed text", () => {
    for (const input of ["", "1", "42", "42 2027", "13.10.2026"]) {
      const { suggestions } = buildSuggestions(input, today, "fi");
      expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
      expect(suggestions.map((s) => s.content)).not.toContain(input.trim());
    }
  });
});

describe("omniboxTargetUrl", () => {
  it("opens the tagged week page", () => {
    expect(omniboxTargetUrl("42", today)).toBe(
      "https://viikkonro.fi/viikko-42-2026?utm_source=extension&utm_medium=referral&utm_campaign=omnibox",
    );
    expect(omniboxTargetUrl("", today)).toContain("/viikko-37-2026?");
  });

  it("does nothing for invalid input", () => {
    expect(omniboxTargetUrl("54", today)).toBeNull();
  });
});
