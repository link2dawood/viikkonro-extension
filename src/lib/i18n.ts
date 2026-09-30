import en from "../../public/_locales/en/messages.json";
import fi from "../../public/_locales/fi/messages.json";
import sv from "../../public/_locales/sv/messages.json";
import type { Language } from "./settings";

export type Lang = "fi" | "en" | "sv";
export type MessageKey = keyof typeof fi;

interface Message {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

// Both catalogs are bundled because the language setting (FR-5.3) must
// override the browser locale, and browser.i18n.getMessage can't do that.
// _locales stays the single source: the manifest reads the same files.
const CATALOGS: Record<Lang, Record<MessageKey, Message>> = { fi, en, sv };

export function resolveLang(setting: Language, uiLanguage: string): Lang {
  if (setting !== "auto") return setting;
  // Anything else falls back to default_locale, as the manifest does.
  const code = uiLanguage.toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code.startsWith("sv")) return "sv";
  return "fi";
}

/** i18n.getMessage semantics ($NAME$ placeholders → $1…$9) for a chosen language. */
export function t(lang: Lang, key: MessageKey, ...substitutions: (string | number)[]): string {
  const entry = CATALOGS[lang][key];
  let text = entry.message;
  for (const [name, { content }] of Object.entries(entry.placeholders ?? {})) {
    text = text.replaceAll(`$${name.toUpperCase()}$`, content);
  }
  return text.replace(/\$(\d)/g, (_match, index: string) => String(substitutions[Number(index) - 1] ?? ""));
}
