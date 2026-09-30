import { formatDate } from "../lib/format";
import { t, type Lang } from "../lib/i18n";
import { relativeDayText } from "../lib/omnibox";
import type { Countdown } from "../lib/settings";
import { parseISODate } from "../lib/week";

/** The user's own date from settings: "Kesäloma · 1.6.2027 · 244 päivän päästä, 168 työpäivää siihen asti". */
export function CountdownBlock({ lang, today, countdown }: { lang: Lang; today: Date; countdown: Countdown | null }) {
  const date = countdown ? parseISODate(countdown.date) : null;
  if (!countdown || !date) return null;

  return (
    <section className="panel countdown">
      <div className="eyebrow">{t(lang, "countdownTitle")}</div>
      <div className="countdown-row">
        <b>{countdown.label || formatDate(date, lang)}</b>
        {countdown.label && <span className="mono countdown-date">{formatDate(date, lang)}</span>}
      </div>
      <span className="countdown-when mono">{relativeDayText(date, today, lang)}</span>
    </section>
  );
}
