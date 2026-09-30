import { describe, expect, it } from "vitest";
import { buildSuggestions, MAX_SUGGESTIONS, omniboxTargetUrl, parseOmniboxInput, parseOmniboxQuery } from "./omnibox";

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
    ["+3", [[40, 2026]]],
    ["+ 3", [[40, 2026]]],
    ["-2", [[35, 2026]]],
    ["+17", [[1, 2027]]],
    ["+0", [[37, 2026]]],
    ["42-50", [[42, 2026]]],
    ["42 – 50", [[42, 2026]]],
    ["42-50 2027", [[42, 2027]]],
    ["50-3", [[50, 2026]]],
    ["juhannus", [[25, 2027], [25, 2027]]],
    ["juhannus 2026", [[25, 2026], [25, 2026]]],
    ["itsenäisyyspäivä", [[49, 2026]]],
    ["Paasiainen 2027", [[12, 2027]]],
  ])("%j resolves", (input, expected) => {
    expect(parseOmniboxInput(input, today)).toEqual(expected.map(([week, year]) => ({ week, year })));
  });

  it.each([
    "0",
    "54",
    "53 2027",
    "31.2.2026",
    "2026-02-30",
    "42 2019",
    "42 2036",
    "abc",
    "4 2",
    "+105",
    "42-54",
    "0-5",
    "joulu 2019",
    "jo",
  ])(
    "%j is not a valid week",
    (input) => {
      expect(parseOmniboxInput(input, today)).toEqual([]);
    },
  );
});

describe("parseOmniboxQuery", () => {
  it("tells ranges and holidays apart from plain weeks", () => {
    expect(parseOmniboxQuery("42", today)[0]).toEqual({ kind: "week", ref: { week: 42, year: 2026 } });
    expect(parseOmniboxQuery("50-3", today)).toEqual([
      { kind: "range", ref: { week: 50, year: 2026 }, end: { week: 3, year: 2027 } },
    ]);
    expect(parseOmniboxQuery("joulu", today).map((match) => match.kind)).toEqual(["holiday", "holiday"]);
  });
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

  it("mentions short weeks' working days", () => {
    expect(buildSuggestions("52", today, "fi").defaultDescription).toBe("Viikko 52: 21.–27.12.2026 · 3 työpäivää");
    expect(buildSuggestions("52", today, "en").defaultDescription).toMatch(/^Week 52: .* · 3 working days$/);
  });

  it("describes a week range with its length and working days", () => {
    expect(buildSuggestions("42-50", today, "fi").defaultDescription).toBe(
      "Viikot 42–50: 12.10.–13.12.2026 · 9 viikkoa, 45 työpäivää",
    );
    expect(buildSuggestions("50-3", today, "fi").defaultDescription).toBe(
      // 2026 has 53 weeks: 50, 51, 52, 53, 1, 2, 3.
      "Viikot 50–3: 7.12.2026–24.1.2027 · 7 viikkoa, 31 työpäivää",
    );
  });

  it("names the holiday, its date and week", () => {
    const result = buildSuggestions("juhannus", today, "fi");
    expect(result.defaultDescription).toBe("Juhannuspäivä lauantai 26.6.2027 · viikko 25");
    expect(result.suggestions).toEqual([
      { content: "25 2027", description: "Juhannusaatto perjantai 25.6.2027 · viikko 25" },
    ]);
    expect(buildSuggestions("christmas", today, "en").defaultDescription).toMatch(
      /^Christmas Day Friday 25 Dec 2026 · week 52$/,
    );
  });

  it("never exceeds the suggestion cap or repeats the typed text", () => {
    for (const input of ["", "1", "42", "42 2027", "13.10.2026", "+3", "42-50", "joulu", "hel"]) {
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

  it("opens the first week of a range or a holiday's week", () => {
    expect(omniboxTargetUrl("42-50", today)).toContain("/viikko-42-2026?");
    expect(omniboxTargetUrl("+3", today)).toContain("/viikko-40-2026?");
    expect(omniboxTargetUrl("itsenäisyyspäivä", today)).toContain("/viikko-49-2026?");
  });

  it("does nothing for invalid input", () => {
    expect(omniboxTargetUrl("54", today)).toBeNull();
  });
});
