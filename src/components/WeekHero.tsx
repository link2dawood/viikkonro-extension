import { useEffect, useState } from "react";
import { copyToClipboard, weekCopyText } from "../lib/clipboard";
import { formatDateRange } from "../lib/format";
import { t, type Lang } from "../lib/i18n";
import type { CopyFormat } from "../lib/settings";
import { PUBLIC_HOLIDAY_NAME, weekWorkdays, workdaysText } from "../lib/publicHolidays";
import { hasWeekPage, sitePath, siteUrl } from "../lib/site";
import { getISOWeekRange, getWeeksInISOYear, type WeekRef } from "../lib/week";
import { ExternalLink } from "./ExternalLink";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon } from "./icons";

interface Props {
  lang: Lang;
  today: Date;
  viewed: WeekRef;
  copyFormat: CopyFormat;
  isCurrent: boolean;
  onStep: (delta: number) => void;
  onReset: () => void;
}

// The site's homepage hero card (Weekcounter.jsx), sized for a 360px popup.
export function WeekHero({ lang, today, viewed, copyFormat, isCurrent, onStep, onReset }: Props) {
  const { start, end } = getISOWeekRange(viewed.week, viewed.year);
  const totalWeeks = getWeeksInISOYear(viewed.year);
  const { workdays, holidays } = weekWorkdays(viewed);
  // The confirmation belongs to the week that was copied, so stepping away hides it.
  const [copied, setCopied] = useState<{ week: number; year: number; ok: boolean } | null>(null);
  const copyState =
    copied && copied.week === viewed.week && copied.year === viewed.year ? (copied.ok ? "copied" : "failed") : "idle";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => setCopied({ ...viewed, ok: await copyToClipboard(weekCopyText(viewed, lang, copyFormat)) });
  const copyLabel = t(lang, copyState === "copied" ? "copied" : copyState === "failed" ? "copyFailed" : "copyWeek");
  const number = (
    <>
      <span className="vk">{t(lang, "weekWord")}</span>
      <span className="num">{viewed.week}</span>
    </>
  );

  return (
    <section className="hero-card">
      <div className="hero-top">
        <div className="now-label">{t(lang, isCurrent ? "nowLabel" : "selectedWeekLabel")}</div>
        {!isCurrent && (
          <button type="button" className="text-btn" onClick={onReset}>
            {t(lang, "backToCurrent")}
          </button>
        )}
      </div>

      <div className="hero-row">
        <button
          type="button"
          className="step"
          onClick={() => onStep(-1)}
          aria-label={t(lang, "prevWeek")}
          title={t(lang, "prevWeek")}
        >
          <ChevronLeftIcon />
        </button>
        {hasWeekPage(viewed.year, today) ? (
          <ExternalLink className="week-big" href={siteUrl(sitePath.week(viewed.week, viewed.year), "popup")}>
            {number}
          </ExternalLink>
        ) : (
          <div className="week-big">{number}</div>
        )}
        <button
          type="button"
          className="step"
          onClick={() => onStep(1)}
          aria-label={t(lang, "nextWeek")}
          title={t(lang, "nextWeek")}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="range-row">
        <span className="range mono" aria-live="polite">
          {formatDateRange(start, end, lang)}
        </span>
        <button
          type="button"
          className={`copy-btn${copyState === "idle" ? "" : ` is-${copyState}`}`}
          onClick={() => void copy()}
          aria-label={copyLabel}
          title={copyLabel}
        >
          {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
        </button>
        <span className="visually-hidden" role="status">
          {copyState === "idle" ? "" : copyLabel}
        </span>
      </div>
      <div className={`workdays${workdays < 5 ? " is-short" : ""}`}>
        <b>{workdaysText(workdays, lang)}</b>
        {holidays.length > 0 && <> · {holidays.map((holiday) => t(lang, PUBLIC_HOLIDAY_NAME[holiday.key])).join(", ")}</>}
      </div>

      <div className="progress">
        <div className="progress-head">
          <span>
            {t(lang, "yearLabel")} <b>{viewed.year}</b>
          </span>
          <b>{t(lang, "weekOfTotal", viewed.week, totalWeeks)}</b>
        </div>
        <div className="comb" aria-hidden="true">
          {Array.from({ length: totalWeeks }, (_, index) => {
            const week = index + 1;
            const status = week === viewed.week ? "now" : week < viewed.week ? "past" : undefined;
            return <i key={week} className={status} />;
          })}
        </div>
      </div>
    </section>
  );
}
