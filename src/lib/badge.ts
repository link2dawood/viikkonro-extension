import { browser } from "wxt/browser";
import { dataset } from "../data/dataset";
import type { Dataset } from "../data/types";
import { formatDateRange } from "./format";
import { flagDaysOn, schoolHolidayOn } from "./holidays";
import { t, type Lang } from "./i18n";
import { publicHolidaysOn } from "./publicHolidays";
import { BADGE_STATE_KEY, getSettings, langFor, type BadgeFormat, type Settings } from "./settings";
import { getISOWeekRange, getWeekRef, msUntilNextMidnight, toISODate } from "./week";

export const BADGE_COLORS = { background: "#1f7a5c", text: "#e7eceb" } as const;

// Highlight colours, in priority order when a day is several things at once.
// Each pair keeps the week number at 4.5:1 contrast or better (badge.test.ts).
export const BADGE_HIGHLIGHTS = {
  publicHoliday: { background: "#b04a2f", text: "#ffffff" },
  flagDay: { background: "#0b4ea2", text: "#ffffff" },
  schoolHoliday: { background: "#e0a23b", text: "#15211f" },
} as const;

export type BadgeHighlight = keyof typeof BADGE_HIGHLIGHTS;

export const MIDNIGHT_ALARM = "badge-midnight";
// Safety net for a missed midnight: Chrome delays alarms while the machine
// sleeps, and a timezone change moves local midnight.
export const HOURLY_ALARM = "badge-hourly";

export interface BadgeState {
  date: string;
  text: string;
  title: string;
  background: string;
  textColor: string;
}

export type BadgeOptions = Pick<Settings, "badgeFormat" | "badgeHighlight" | "city">;

/** "42" or "vk42". Never over 4 characters, Chrome's badge limit (FR-1.1). */
export function badgeText(week: number, format: BadgeFormat, lang: Lang): string {
  return format === "prefixed" ? `${t(lang, "badgePrefix")}${week}` : String(week);
}

/** What makes `date` special enough to recolour the badge, if anything. */
export function badgeHighlightFor(
  date: Date,
  city: string | null,
  data: Pick<Dataset, "flagDays" | "schoolHolidays"> = dataset,
): BadgeHighlight | null {
  if (publicHolidaysOn(date).length > 0) return "publicHoliday";
  if (flagDaysOn(data.flagDays, date).length > 0) return "flagDay";
  if (city !== null && schoolHolidayOn(data.schoolHolidays, city, date)) return "schoolHoliday";
  return null;
}

export function computeBadgeState(
  now: Date,
  options: BadgeOptions,
  lang: Lang,
  data: Pick<Dataset, "flagDays" | "schoolHolidays"> = dataset,
): BadgeState {
  const { week, year } = getWeekRef(now);
  const { start, end } = getISOWeekRange(week, year);
  const highlight = options.badgeHighlight ? badgeHighlightFor(now, options.city, data) : null;
  const colors = highlight ? BADGE_HIGHLIGHTS[highlight] : BADGE_COLORS;
  return {
    date: toISODate(now),
    text: badgeText(week, options.badgeFormat, lang),
    title: t(lang, "badgeTooltip", week, formatDateRange(start, end, lang)),
    background: colors.background,
    textColor: colors.text,
  };
}

/** Recomputes and applies the badge, then persists what was applied (FR-1.3). */
export async function refreshBadge(now = new Date()): Promise<BadgeState> {
  const settings = await getSettings();
  const state = computeBadgeState(now, settings, langFor(settings));
  await Promise.all([
    browser.action.setBadgeText({ text: state.text }),
    browser.action.setBadgeBackgroundColor({ color: state.background }),
    browser.action.setBadgeTextColor({ color: state.textColor }),
    browser.action.setTitle({ title: state.title }),
    browser.storage.local.set({ [BADGE_STATE_KEY]: state }),
  ]);
  return state;
}

export async function scheduleBadgeAlarms(now = new Date()): Promise<void> {
  // Re-created on every wake: a one-shot at the coming local midnight is
  // DST-proof, where a fixed 24h period would drift by an hour twice a year.
  await browser.alarms.create(MIDNIGHT_ALARM, { when: now.getTime() + msUntilNextMidnight(now) + 1_000 });
  if (!(await browser.alarms.get(HOURLY_ALARM))) {
    await browser.alarms.create(HOURLY_ALARM, { periodInMinutes: 60 });
  }
}
