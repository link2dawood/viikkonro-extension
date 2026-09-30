import { dataset } from "../data/dataset";
import { specialDayNames } from "../lib/badge";
import { monthGrid, monthOfWeek, shiftMonth, type MonthRef } from "../lib/calendar";
import { formatDate, formatMonth, weekdayNamesShort } from "../lib/format";
import { flagDaysOn, schoolHolidayOn } from "../lib/holidays";
import { t, type Lang } from "../lib/i18n";
import { publicHolidaysOn } from "../lib/publicHolidays";
import { toISODate, type WeekRef } from "../lib/week";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

interface Props {
  lang: Lang;
  today: Date;
  viewed: WeekRef;
  city: string | null;
  onSelectWeek: (ref: WeekRef) => void;
  onStepMonth: (target: MonthRef) => void;
}

// A paper-calendar month: week numbers down the side, holidays marked.
// Follows the viewed week, so the hero's arrows and this view stay in step.
export function MonthCalendar({ lang, today, viewed, city, onSelectWeek, onStepMonth }: Props) {
  const month = monthOfWeek(viewed);
  const rows = monthGrid(month);
  const todayKey = toISODate(today);
  const title = formatMonth(month.year, month.month, lang);

  return (
    <section className="panel calendar" aria-label={title}>
      <div className="cal-head">
        <button
          type="button"
          className="step step-sm"
          onClick={() => onStepMonth(shiftMonth(month, -1))}
          aria-label={t(lang, "prevMonth")}
          title={t(lang, "prevMonth")}
        >
          <ChevronLeftIcon />
        </button>
        <div className="cal-title">{title}</div>
        <button
          type="button"
          className="step step-sm"
          onClick={() => onStepMonth(shiftMonth(month, 1))}
          aria-label={t(lang, "nextMonth")}
          title={t(lang, "nextMonth")}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <table className="cal-grid">
        <thead>
          <tr>
            <th scope="col" className="cal-wk">
              {t(lang, "weekColumn")}
            </th>
            {weekdayNamesShort(lang).map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.ref.week === viewed.week && row.ref.year === viewed.year;
            return (
              <tr key={`${row.ref.year}-${row.ref.week}`} className={selected ? "is-selected" : undefined}>
                <th scope="row" className="cal-wk">
                  <button
                    type="button"
                    onClick={() => onSelectWeek(row.ref)}
                    aria-pressed={selected}
                    aria-label={t(lang, "selectWeek", row.ref.week)}
                  >
                    {row.ref.week}
                  </button>
                </th>
                {row.days.map((day) => {
                  const holidays = publicHolidaysOn(day);
                  const flags = flagDaysOn(dataset.flagDays, day);
                  const school = city ? schoolHolidayOn(dataset.schoolHolidays, city, day) : null;
                  const notes = specialDayNames(day, city, lang);
                  const classes = [
                    day.getMonth() !== month.month && "is-outside",
                    toISODate(day) === todayKey && "is-today",
                    (holidays.length > 0 || day.getDay() === 0) && "is-holiday",
                    school && "is-school",
                    flags.length > 0 && "is-flag",
                  ].filter(Boolean);
                  return (
                    <td
                      key={day.getTime()}
                      className={classes.join(" ") || undefined}
                      title={[formatDate(day, lang), ...notes].join(" · ")}
                    >
                      {day.getDate()}
                      {notes.length > 0 && <span className="visually-hidden">, {notes.join(", ")}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="cal-legend" aria-hidden="true">
        <span className="lg-holiday">{t(lang, "legendHoliday")}</span>
        {city && <span className="lg-school">{t(lang, "legendSchoolHoliday")}</span>}
        <span className="lg-flag">{t(lang, "flagDayLabel")}</span>
      </div>
    </section>
  );
}
