// FR-4.3: the bundle must cover the current calendar year and the next.
// Structural parameter type (not Dataset) so wxt.config.ts can pass the raw
// JSON import, whose string fields TypeScript doesn't narrow to unions.
interface CoverageInput {
  schoolHolidays: { years: number[] };
  flagDays: { date: string }[];
}

export function missingDatasetYears(dataset: CoverageInput, now: Date): string[] {
  const required = [now.getFullYear(), now.getFullYear() + 1];
  const problems: string[] = [];
  for (const year of required) {
    if (!dataset.schoolHolidays.years.includes(year)) problems.push(`school holidays ${year}`);
    if (!dataset.flagDays.some((day) => day.date.startsWith(`${year}-`))) problems.push(`flag days ${year}`);
  }
  return problems;
}

export function assertDatasetCoverage(dataset: CoverageInput, now: Date): void {
  const problems = missingDatasetYears(dataset, now);
  if (problems.length > 0) {
    throw new Error(
      `Bundled data is missing: ${problems.join(", ")}. ` +
        "Run `VIIKKONRO_SITE_DIR=/path/to/site pnpm data:sync` (the site must publish those years first).",
    );
  }
}
