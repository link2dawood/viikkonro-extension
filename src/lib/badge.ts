import { browser } from "wxt/browser";
import { formatDateRange } from "./format";
import { t, type Lang } from "./i18n";
import { BADGE_STATE_KEY, getSettings, langFor, type BadgeFormat } from "./settings";
import { getISOWeekRange, getWeekRef, msUntilNextMidnight, toISODate } from "./week";

export const BADGE_COLORS = { background: "#1f7a5c", text: "#e7eceb" } as const;

export const MIDNIGHT_ALARM = "badge-midnight";
// Safety net for a missed midnight: Chrome delays alarms while the machine
// sleeps, and a timezone change moves local midnight.
export const HOURLY_ALARM = "badge-hourly";

export interface BadgeState {
  date: string;
  text: string;
  title: string;
}

/** "42" or "vk42". Never over 4 characters, Chrome's badge limit (FR-1.1). */
export function badgeText(week: number, format: BadgeFormat, lang: Lang): string {
  return format === "prefixed" ? `${t(lang, "badgePrefix")}${week}` : String(week);
}

export function computeBadgeState(now: Date, format: BadgeFormat, lang: Lang): BadgeState {
  const { week, year } = getWeekRef(now);
  const { start, end } = getISOWeekRange(week, year);
  return {
    date: toISODate(now),
    text: badgeText(week, format, lang),
    title: t(lang, "badgeTooltip", week, formatDateRange(start, end, lang)),
  };
}

/** Recomputes and applies the badge, then persists what was applied (FR-1.3). */
export async function refreshBadge(now = new Date()): Promise<BadgeState> {
  const settings = await getSettings();
  const state = computeBadgeState(now, settings.badgeFormat, langFor(settings));
  await Promise.all([
    browser.action.setBadgeText({ text: state.text }),
    browser.action.setBadgeBackgroundColor({ color: BADGE_COLORS.background }),
    browser.action.setBadgeTextColor({ color: BADGE_COLORS.text }),
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
