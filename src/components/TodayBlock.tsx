import { dataset } from "../data/dataset";
import { formatDate, formatWeekday } from "../lib/format";
import { flagDaysOn, nameDaysOn } from "../lib/holidays";
import { t, type Lang } from "../lib/i18n";
import { sitePath, siteUrl } from "../lib/site";
import { ExternalLink } from "./ExternalLink";

export function TodayBlock({ lang, today }: { lang: Lang; today: Date }) {
  const flagDays = flagDaysOn(dataset.flagDays, today);
  // Always [] until the site's name-day licensing clears and sync-data bundles them.
  const names = nameDaysOn(dataset.nameDays, today);

  return (
    <section className="panel today">
      <div className="eyebrow">{t(lang, "todayLabel")}</div>
      <div className="today-date">
        {formatWeekday(today, lang)} <span className="mono">{formatDate(today, lang)}</span>
      </div>
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
    </section>
  );
}
