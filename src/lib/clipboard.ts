import { formatDateRange } from "./format";
import { t, type Lang } from "./i18n";
import type { CopyFormat } from "./settings";
import { getISOWeekRange, type WeekRef } from "./week";

/**
 * The week as a line to paste into an email or a ticket:
 * text "Viikko 42 (12.–18.10.2026)", iso "2026-W42", short "vk 42", dates "12.–18.10.2026".
 */
export function weekCopyText(ref: WeekRef, lang: Lang, format: CopyFormat = "text"): string {
  const { start, end } = getISOWeekRange(ref.week, ref.year);
  const range = formatDateRange(start, end, lang);
  switch (format) {
    case "iso":
      return `${ref.year}-W${String(ref.week).padStart(2, "0")}`;
    case "short":
      return `${t(lang, "badgePrefix")} ${ref.week}`;
    case "dates":
      return range;
    default:
      return t(lang, "copyText", ref.week, range);
  }
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
