import { browser } from "wxt/browser";

/** FR-5.5: the options page, opened from the popup, which then closes. */
export async function openOptions(): Promise<void> {
  await browser.runtime.openOptionsPage();
  window.close();
}
