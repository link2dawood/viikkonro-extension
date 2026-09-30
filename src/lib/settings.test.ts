import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { DEFAULT_SETTINGS, getSettings, normalizeSettings, resetSettings, saveSettings } from "./settings";

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
});

describe("settings", () => {
  it("defaults when nothing is stored", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("saves to storage.sync", async () => {
    await saveSettings({ city: "Tampere" });
    expect(await browser.storage.sync.get("settings")).toEqual({
      settings: { ...DEFAULT_SETTINGS, city: "Tampere" },
    });
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, city: "Tampere" });
  });

  it("falls back to storage.local when a sync write fails, and prefers it on read", async () => {
    await saveSettings({ city: "Oulu" });
    vi.spyOn(browser.storage.sync, "set").mockRejectedValueOnce(new Error("QUOTA_BYTES_PER_ITEM"));
    await saveSettings({ city: "Turku" });
    expect(await browser.storage.local.get("settings")).toEqual({ settings: { ...DEFAULT_SETTINGS, city: "Turku" } });
    expect((await getSettings()).city).toBe("Turku");

    // The next successful sync write clears the local copy again.
    await saveSettings({ city: "Vaasa" });
    expect(await browser.storage.local.get("settings")).toEqual({});
    expect((await getSettings()).city).toBe("Vaasa");
  });

  it("reset clears only this extension's keys", async () => {
    await saveSettings({ badgeFormat: "prefixed" });
    await browser.storage.local.set({ badgeState: { date: "2026-09-11" }, unrelated: 1 });
    await resetSettings();
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await browser.storage.local.get(null)).toEqual({ unrelated: 1 });
  });

  it("ignores malformed stored values", () => {
    expect(
      normalizeSettings({
        city: 3,
        badgeFormat: "big",
        language: "de",
        showCalendar: "yes",
        badgeHighlight: "no",
        copyFormat: "html",
      }),
    ).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("junk")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ language: "sv" }).language).toBe("sv");
  });
});
