import { useEffect, useState } from "react";
import markUrl from "../../assets/brand-mark.svg";
import { ExternalLink } from "../../components/ExternalLink";
import { HolidayBlock } from "../../components/HolidayBlock";
import { GearIcon } from "../../components/icons";
import { TodayBlock } from "../../components/TodayBlock";
import { WeekHero } from "../../components/WeekHero";
import { dataset } from "../../data/dataset";
import { useSettings } from "../../hooks/useSettings";
import { refreshBadge } from "../../lib/badge";
import { formatDate } from "../../lib/format";
import { isDataStale } from "../../lib/holidays";
import { t } from "../../lib/i18n";
import { openOptions } from "../../lib/navigation";
import { langFor } from "../../lib/settings";
import { sitePath, siteUrl } from "../../lib/site";
import { getWeekRef, parseISODate, shiftWeek } from "../../lib/week";

// Everything below reads bundled JSON and storage.local/sync: no network on
// open (FR-2.7).
export function App() {
  const { settings } = useSettings();
  const [today] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const lang = settings ? langFor(settings) : null;

  // Opening the popup also repairs a badge whose midnight alarm fired late.
  useEffect(() => {
    void refreshBadge(today);
  }, [today]);

  useEffect(() => {
    if (lang) document.documentElement.lang = lang;
  }, [lang]);

  if (!settings || !lang) return null;

  const viewed = shiftWeek(getWeekRef(today), offset);
  // A city dropped by a later data sync falls back to the "choose a city" state.
  const city = settings.city !== null && dataset.schoolHolidays.cities.includes(settings.city) ? settings.city : null;
  const generatedAt = parseISODate(dataset.generatedAt);

  return (
    <div className="popup">
      <header className="pop-head">
        <span className="brand">
          <img src={markUrl} alt="" width={22} height={22} />
          {t(lang, "extShortName")}
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void openOptions()}
          aria-label={t(lang, "settings")}
          title={t(lang, "settings")}
        >
          <GearIcon />
        </button>
      </header>

      <WeekHero
        lang={lang}
        today={today}
        viewed={viewed}
        isCurrent={offset === 0}
        onStep={(delta) => setOffset((current) => current + delta)}
        onReset={() => setOffset(0)}
      />
      <TodayBlock lang={lang} today={today} />
      <HolidayBlock lang={lang} today={today} city={city} />

      <footer className="pop-foot">
        <ExternalLink href={siteUrl(sitePath.home, "popup")}>{t(lang, "siteLinkLabel")}</ExternalLink>
        {generatedAt && <span>{t(lang, "dataDate", formatDate(generatedAt, lang))}</span>}
      </footer>
      {isDataStale(dataset.generatedAt, today) && <p className="stale-note">{t(lang, "dataStale")}</p>}
    </div>
  );
}
