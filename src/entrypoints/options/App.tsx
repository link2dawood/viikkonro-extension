import { useEffect, useState, type ReactNode } from "react";
import { browser } from "wxt/browser";
import markUrl from "../../assets/brand-mark.svg";
import { ExternalLink } from "../../components/ExternalLink";
import { dataset } from "../../data/dataset";
import { useSettings } from "../../hooks/useSettings";
import { badgeText } from "../../lib/badge";
import { t } from "../../lib/i18n";
import { langFor, resetSettings, type BadgeFormat, type Language, type Settings } from "../../lib/settings";
import { sitePath, siteUrl } from "../../lib/site";
import { getISOWeek } from "../../lib/week";

function Pill({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="pill" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function App() {
  const { settings, update } = useSettings();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "reset">("idle");
  // undefined while loading; "" when the user has cleared the shortcut.
  const [shortcut, setShortcut] = useState<string>();
  const lang = settings ? langFor(settings) : null;

  useEffect(() => {
    if (!lang) return;
    document.documentElement.lang = lang;
    document.title = `${t(lang, "optionsTitle")} · ${t(lang, "extShortName")}`;
  }, [lang]);

  useEffect(() => {
    void browser.commands
      .getAll()
      .then((commands) => setShortcut(commands.find((command) => command.name === "_execute_action")?.shortcut ?? ""))
      .catch(() => setShortcut(""));
  }, []);

  if (!settings || !lang) return null;

  const save = async (patch: Partial<Settings>) => {
    await update(patch);
    setStatus("saved");
  };
  const reset = async () => {
    await resetSettings();
    setQuery("");
    setStatus("reset");
  };

  const needle = query.trim().toLocaleLowerCase("fi");
  const cities = dataset.schoolHolidays.cities.filter((city) => city.toLocaleLowerCase("fi").includes(needle));
  const week = getISOWeek(new Date());
  const badgeFormats: BadgeFormat[] = ["number", "prefixed"];
  const languages: [Language, string][] = [
    ["auto", t(lang, "languageAuto")],
    ["fi", t(lang, "languageFi")],
    ["en", t(lang, "languageEn")],
  ];

  return (
    <main className="options">
      <span className="brand">
        <img src={markUrl} alt="" width={28} height={28} />
        {t(lang, "extShortName")}
      </span>

      <div className="eyebrow">{t(lang, "optionsEyebrow")}</div>
      <h1>{t(lang, "optionsTitle")}</h1>
      <p className="lead">{t(lang, "optionsIntro")}</p>

      {dataset.schoolHolidays.cities.length > 0 && (
        <section className="panel opt-section">
          <h2>{t(lang, "cityLabel")}</h2>
          <p className="note-soft">{t(lang, "cityHint")}</p>
          <input
            type="search"
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(lang, "citySearch")}
            aria-label={t(lang, "citySearch")}
          />
          <div className="pills" role="group" aria-label={t(lang, "cityLabel")}>
            <Pill pressed={settings.city === null} onClick={() => void save({ city: null })}>
              {t(lang, "cityNone")}
            </Pill>
            {cities.map((city) => (
              <Pill key={city} pressed={settings.city === city} onClick={() => void save({ city })}>
                {city}
              </Pill>
            ))}
          </div>
          {cities.length === 0 && <p className="note-soft">{t(lang, "cityNoResults")}</p>}
        </section>
      )}

      <section className="panel opt-section">
        <h2>{t(lang, "badgeFormatLabel")}</h2>
        <p className="note-soft">{t(lang, "badgeFormatHint")}</p>
        <div className="pills" role="group" aria-label={t(lang, "badgeFormatLabel")}>
          {badgeFormats.map((format) => (
            <Pill key={format} pressed={settings.badgeFormat === format} onClick={() => void save({ badgeFormat: format })}>
              {badgeText(week, format, lang)}
            </Pill>
          ))}
        </div>
        <h3>{t(lang, "badgeHighlightLabel")}</h3>
        <p className="note-soft">{t(lang, "badgeHighlightHint")}</p>
        <div className="pills" role="group" aria-label={t(lang, "badgeHighlightLabel")}>
          {[true, false].map((value) => (
            <Pill
              key={String(value)}
              pressed={settings.badgeHighlight === value}
              onClick={() => void save({ badgeHighlight: value })}
            >
              {t(lang, value ? "on" : "off")}
            </Pill>
          ))}
        </div>
      </section>

      <section className="panel opt-section">
        <h2>{t(lang, "languageLabel")}</h2>
        <div className="pills" role="group" aria-label={t(lang, "languageLabel")}>
          {languages.map(([value, label]) => (
            <Pill key={value} pressed={settings.language === value} onClick={() => void save({ language: value })}>
              {label}
            </Pill>
          ))}
        </div>
      </section>

      <section className="panel opt-section">
        <h2>{t(lang, "omniboxHelpTitle")}</h2>
        <p className="note-soft">{t(lang, "omniboxHelp")}</p>
      </section>

      {shortcut !== undefined && (
        <section className="panel opt-section">
          <h2>{t(lang, "shortcutTitle")}</h2>
          <p className="note-soft">
            {shortcut ? (
              <>
                <kbd>{shortcut}</kbd> {t(lang, "shortcutHelp")}
              </>
            ) : (
              t(lang, "shortcutNone")
            )}
          </p>
        </section>
      )}

      <div className="opt-actions">
        <button type="button" className="btn btn-secondary" onClick={() => void reset()}>
          {t(lang, "reset")}
        </button>
        <span className="status" role="status">
          {status === "saved" ? t(lang, "saved") : status === "reset" ? t(lang, "resetDone") : ""}
        </span>
      </div>

      <footer className="opt-foot">
        <ExternalLink href={siteUrl(sitePath.privacy, "options")}>{t(lang, "privacyLink")}</ExternalLink>
        <ExternalLink href={siteUrl(sitePath.home, "options")}>{t(lang, "siteLinkLabel")}</ExternalLink>
      </footer>
    </main>
  );
}
