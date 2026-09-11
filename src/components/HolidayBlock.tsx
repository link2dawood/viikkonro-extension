import { dataset } from "../data/dataset";
import { formatDateRange } from "../lib/format";
import { nextSchoolHoliday, type UpcomingHoliday } from "../lib/holidays";
import { t, type Lang } from "../lib/i18n";
import { openOptions } from "../lib/navigation";
import { sitePath, siteUrl } from "../lib/site";
import { ExternalLink } from "./ExternalLink";

function whenText(holiday: UpcomingHoliday, lang: Lang): string {
  if (holiday.kind === "undated") return t(lang, "holidayNotConfirmed");
  const range = formatDateRange(holiday.start, holiday.end, lang);
  if (holiday.kind === "ongoing") return `${range} · ${t(lang, "holidayOngoing")}`;
  const countdown =
    holiday.daysUntil === 1 ? t(lang, "holidayStartsTomorrow") : t(lang, "holidayStartsInDays", holiday.daysUntil);
  return `${range} · ${countdown}`;
}

export function HolidayBlock({ lang, today, city }: { lang: Lang; today: Date; city: string | null }) {
  // FR-2.6: an empty dataset hides the block instead of rendering it blank.
  if (dataset.schoolHolidays.cities.length === 0) return null;

  if (city === null) {
    return (
      <section className="ql holiday">
        <div className="eyebrow">{t(lang, "nextHolidayLabel")}</div>
        <p className="hint">{t(lang, "chooseCityHint")}</p>
        <button type="button" className="btn" onClick={() => void openOptions()}>
          {t(lang, "chooseCity")}
        </button>
      </section>
    );
  }

  const holiday = nextSchoolHoliday(dataset.schoolHolidays, city, today);
  if (!holiday) return null;
  const { period } = holiday;

  return (
    <ExternalLink className="ql holiday" href={siteUrl(sitePath.schoolHolidays(period.year), "popup")}>
      <div className="eyebrow">
        {t(lang, "nextHolidayLabel")} · {city}
      </div>
      <div className="holiday-row">
        <b>
          {t(lang, period.type === "hiihtoloma" ? "holidayHiihtoloma" : "holidaySyysloma")} {period.year}
        </b>
        {/* FR-2.4: the tier is shown only when it isn't the highest. */}
        {period.confidence !== "confirmed" && (
          <span className={`confidence-badge confidence-${period.confidence}`}>
            {t(lang, period.confidence === "estimated" ? "confidenceEstimated" : "confidenceUnknown")}
          </span>
        )}
      </div>
      <span className="holiday-when mono">{whenText(holiday, lang)}</span>
    </ExternalLink>
  );
}
