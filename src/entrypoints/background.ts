import { browser, type Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { HOURLY_ALARM, MIDNIGHT_ALARM, refreshBadge, scheduleBadgeAlarms } from "../lib/badge";
import { buildSuggestions, omniboxTargetUrl } from "../lib/omnibox";
import { getSettings, langFor, SETTINGS_KEY } from "../lib/settings";
import { sitePath, siteUrl } from "../lib/site";

// Chrome runs this as a service worker, Firefox as an event page (FR-10.2).
// Either can be torn down at any moment, so nothing lives in module scope:
// every listener recomputes from the clock and storage.

async function refresh(): Promise<void> {
  await refreshBadge();
  await scheduleBadgeAlarms();
}

// Chrome renders omnibox descriptions as XML; Firefox takes plain text.
function omniboxText(text: string): string {
  if (import.meta.env.BROWSER === "firefox") return text;
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function updateOmnibox(text: string, suggest?: (results: Browser.omnibox.SuggestResult[]) => void) {
  const { defaultDescription, suggestions } = buildSuggestions(text, new Date(), langFor(await getSettings()));
  browser.omnibox.setDefaultSuggestion({ description: omniboxText(defaultDescription) });
  suggest?.(suggestions.map((s) => ({ content: s.content, description: omniboxText(s.description) })));
}

export default defineBackground(() => {
  // Listeners are registered synchronously so the event that woke the
  // worker is still delivered to them.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    void refresh();
    void browser.runtime.setUninstallURL(siteUrl(sitePath.contact, "uninstall"));
    // FR-7.1 / 7.2: first install only, never on update.
    if (reason === "install") void browser.tabs.create({ url: siteUrl(sitePath.home, "install") });
  });

  browser.runtime.onStartup.addListener(() => void refresh());

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === MIDNIGHT_ALARM || alarm.name === HOURLY_ALARM) void refresh();
  });

  // Badge format or language changed in options.
  browser.storage.onChanged.addListener((changes) => {
    if (SETTINGS_KEY in changes) void refreshBadge();
  });

  // FR-3.5: "vk" + space with nothing typed yet suggests the current week.
  browser.omnibox.onInputStarted.addListener(() => void updateOmnibox(""));
  browser.omnibox.onInputChanged.addListener((text, suggest) => void updateOmnibox(text, suggest));
  browser.omnibox.onInputEntered.addListener((text, disposition) => {
    const url = omniboxTargetUrl(text, new Date());
    if (!url) return; // "Not a valid week" is informational only (FR-3.3).
    if (disposition === "currentTab") void browser.tabs.update({ url });
    else void browser.tabs.create({ url, active: disposition === "newForegroundTab" });
  });

  // FR-1.3: every wake re-applies the badge.
  void refresh();
});
