import { browser } from "wxt/browser";
import { resolveLang, type Lang } from "./i18n";

export type Language = "auto" | "fi" | "en";
export type BadgeFormat = "number" | "prefixed";

export interface Settings {
  city: string | null;
  badgeFormat: BadgeFormat;
  language: Language;
  /** The month view in the popup, toggled from its header. */
  showCalendar: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  city: null,
  badgeFormat: "number",
  language: "auto",
  showCalendar: false,
});

// The only keys this extension ever writes; reset clears exactly these (FR-5.4).
export const SETTINGS_KEY = "settings";
export const BADGE_STATE_KEY = "badgeState";

export function normalizeSettings(raw: unknown): Settings {
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    city: typeof value.city === "string" && value.city !== "" ? value.city : null,
    badgeFormat: value.badgeFormat === "prefixed" ? "prefixed" : "number",
    language: value.language === "fi" || value.language === "en" ? value.language : "auto",
    showCalendar: value.showCalendar === true,
  };
}

// Settings live in storage.sync (FR-5.1). storage.local holds a copy only
// while a sync write is failing (quota, sync disabled by policy), and wins on
// read so a failed sync write never resurrects an older synced value.
export async function getSettings(): Promise<Settings> {
  const local = await browser.storage.local.get(SETTINGS_KEY);
  if (local[SETTINGS_KEY] !== undefined) return normalizeSettings(local[SETTINGS_KEY]);
  try {
    const synced = await browser.storage.sync.get(SETTINGS_KEY);
    return normalizeSettings(synced[SETTINGS_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await getSettings()), ...patch });
  try {
    await browser.storage.sync.set({ [SETTINGS_KEY]: next });
    await browser.storage.local.remove(SETTINGS_KEY);
  } catch {
    await browser.storage.local.set({ [SETTINGS_KEY]: next });
  }
  return next;
}

export async function resetSettings(): Promise<void> {
  await Promise.allSettled([
    browser.storage.sync.remove(SETTINGS_KEY),
    browser.storage.local.remove([SETTINGS_KEY, BADGE_STATE_KEY]),
  ]);
}

export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, unknown>) => {
    if (SETTINGS_KEY in changes) void getSettings().then(callback);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function langFor(settings: Settings): Lang {
  return resolveLang(settings.language, browser.i18n.getUILanguage());
}
