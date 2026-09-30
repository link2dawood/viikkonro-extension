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
    ["1.3.–15.6.", [[9, 2026]]],
    ["1.3.2027-15.6.", [[9, 2027]]],
    ["28.12.-3.1.", [[53, 2026]]],
    ["15.6.-1.3.2027", [[25, 2026]]],
    ["2026-10-01..2026-12-31", [[40, 2026]]],
    ["2026-10-01 – 2026-12-31", [[40, 2026]]],
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
    "31.2.-1.3.",
    "1.3.2027-15.6.2026",
    "1.1.2020-1.1.2031",
    "2026-10-01-2026-12-31",
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

  it("counts days and working days to a date", () => {
    const describe = (input: string, lang: "fi" | "en" = "fi") => buildSuggestions(input, today, lang).defaultDescription;
    // Friday 11.9. to Tuesday 13.10.: 32 days; working days 11.9.–12.10. are 1 + 4 × 5 + 1.
    expect(describe("13.10.2026")).toBe("tiistai 13.10.2026 · viikko 42 · 32 päivän päästä, 22 työpäivää siihen asti");
    expect(describe("2026-12-24")).toBe("torstai 24.12.2026 · viikko 52 · 104 päivän päästä, 74 työpäivää siihen asti");
    expect(describe("11.9.")).toBe("perjantai 11.9.2026 · viikko 37 · tänään");
    expect(describe("12.9.")).toBe("lauantai 12.9.2026 · viikko 37 · huomenna");
    expect(describe("10.9.")).toBe("torstai 10.9.2026 · viikko 37 · eilen");
    expect(describe("1.9.2026")).toBe("tiistai 1.9.2026 · viikko 36 · 10 päivää sitten");
    expect(describe("24.12.", "en")).toMatch(/^Thursday 24 Dec 2026 · week 52 · in 104 days, 74 working days until then$/);
  });

  it("counts a date range inclusively", () => {
    const describe = (input: string, lang: "fi" | "en" = "fi") => buildSuggestions(input, today, lang).defaultDescription;
    // March 22 + April 22 − 2 (Easter) + May 21 − 2 (Vappu, Helatorstai) + June 1–15 11.
    expect(describe("1.3.–15.6.")).toBe("1.3.–15.6.2026 · 107 päivää, 72 työpäivää");
    expect(describe("28.12.-3.1.")).toBe("28.12.2026–3.1.2027 · 7 päivää, 4 työpäivää");
    expect(describe("12.10.-12.10.")).toBe("12.10.2026 · 1 päivä, 1 työpäivä");
    expect(describe("1.3.–15.6.", "en")).toMatch(/^1 Mar\s*–\s*15 Jun 2026 · 107 days, 72 working days$/);
  });

  it("speaks Swedish", () => {
    expect(buildSuggestions("42", today, "sv").defaultDescription).toBe("Vecka 42: 12.–18.10.2026");
    expect(buildSuggestions("midsommar 2026", today, "sv").defaultDescription).toBe(
      "Midsommardagen lördag 20.6.2026 · vecka 25",
    );
    expect(buildSuggestions("jul", today, "sv").defaultDescription).toBe("Juldagen fredag 25.12.2026 · vecka 52");
    expect(buildSuggestions("13.10.", today, "sv").defaultDescription).toBe(
      "tisdag 13.10.2026 · vecka 42 · om 32 dagar, 22 arbetsdagar till dess",
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
    for (const input of ["", "1", "42", "42 2027", "13.10.2026", "+3", "42-50", "joulu", "hel", "1.3.-15.6."]) {
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
