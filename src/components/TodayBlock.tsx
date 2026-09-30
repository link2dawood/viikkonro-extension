import { dataset } from "../data/dataset";
import { formatDate, formatWeekday } from "../lib/format";
import { flagDaysOn, nameDaysOn } from "../lib/holidays";
import { t, type Lang } from "../lib/i18n";
import { nextPublicHoliday, PUBLIC_HOLIDAY_NAME, publicHolidaysOn } from "../lib/publicHolidays";
import { sitePath, siteUrl } from "../lib/site";
import { ExternalLink } from "./ExternalLink";

export function TodayBlock({ lang, today }: { lang: Lang; today: Date }) {
  const flagDays = flagDaysOn(dataset.flagDays, today);
  // Always [] until the site's name-day licensing clears and sync-data bundles them.
  const names = nameDaysOn(dataset.nameDays, today);
  const holidaysToday = publicHolidaysOn(today);
  const next = nextPublicHoliday(today);
  const countdown = next.daysUntil === 1 ? t(lang, "countdownTomorrow") : t(lang, "countdownInDays", next.daysUntil);

  return (
    <section className="panel today">
      <div className="eyebrow">{t(lang, "todayLabel")}</div>
      <div className="today-date">
        {formatWeekday(today, lang)} <span className="mono">{formatDate(today, lang)}</span>
      </div>
      {holidaysToday.map((holiday) => (
        <div key={holiday.key} className="today-row">
          <span className="tag">{t(lang, "publicHolidayLabel")}</span>
          <span className="today-text">{t(lang, PUBLIC_HOLIDAY_NAME[holiday.key])}</span>
        </div>
      ))}
      {flagDays.map((flagDay) => (
        <ExternalLink
          key={flagDay.slug}
          className="today-row"
          href={siteUrl(sitePath.flagDays(today.getFullYear()), "popup", flagDay.slug)}
        >
          <span className="tag">{t(lang, "flagDayLabel")}</span>
          <span className="today-text">{flagDay.name}</span>
        </ExternalLink>
      ))}
      {names.length > 0 && (
        <ExternalLink className="today-row" href={siteUrl(sitePath.nameDaysToday, "popup")}>
          <span className="tag">{t(lang, "nameDayLabel")}</span>
          <span className="today-text">{names.join(", ")}</span>
        </ExternalLink>
      )}
      <div className="today-row next-holiday">
        <span className="tag tag-soft">{t(lang, "nextPublicHolidayLabel")}</span>
        <span>
          {t(lang, PUBLIC_HOLIDAY_NAME[next.holiday.key])}{" "}
          <span className="mono next-holiday-when">
            {formatDate(next.holiday.date, lang)} · {countdown}
          </span>
        </span>
      </div>
    </section>
  );
}
