// Shape of src/data/generated/dataset.json, written by scripts/sync-data.mjs.
// Dates are local calendar dates as "YYYY-MM-DD".

export type Confidence = "confirmed" | "estimated" | "unknown";
export type SchoolHolidayType = "hiihtoloma" | "syysloma";

export interface DatedSchoolHoliday {
  type: SchoolHolidayType;
  year: number;
  week: number;
  start: string;
  end: string;
  cities: string[];
  confidence: Exclude<Confidence, "unknown">;
  sourceUrl: string;
}

export interface UndatedSchoolHoliday {
  type: SchoolHolidayType;
  year: number;
  cities: string[];
  confidence: "unknown";
}

export interface FlagDay {
  date: string;
  name: string;
  altName: string | null;
  nameEn: string | null;
  nameSv: string | null;
  slug: string;
}

export interface NameDays {
  attribution: string | null;
  sourceUrl: string | null;
  byDate: Record<string, string[]>;
}

export interface Dataset {
  generatedAt: string;
  source: { site: string; commit: string | null };
  years: number[];
  schoolHolidays: {
    years: number[];
    cities: string[];
    dated: DatedSchoolHoliday[];
    undated: UndatedSchoolHoliday[];
  };
  flagDays: FlagDay[];
  nameDays: NameDays | null;
}
