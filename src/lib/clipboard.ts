import { formatDateRange } from "./format";
import { t, type Lang } from "./i18n";
import { getISOWeekRange, type WeekRef } from "./week";

/** "Viikko 42 (12.–18.10.2026)": the week as a line to paste into an email or a ticket. */
export function weekCopyText(ref: WeekRef, lang: Lang): string {
  const { start, end } = getISOWeekRange(ref.week, ref.year);
  return t(lang, "copyText", ref.week, formatDateRange(start, end, lang));
}

// A click in the popup is a user gesture, and writing to the clipboard from
// one needs no clipboardWrite permission in Chrome or Firefox.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
