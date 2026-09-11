import { useCallback, useEffect, useState } from "react";
import { getSettings, onSettingsChanged, saveSettings, type Settings } from "../lib/settings";

/** Settings from storage, kept live across the popup, options page and a reset. null while loading. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    void getSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });
    const unsubscribe = onSettingsChanged(setSettings);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await saveSettings(patch));
  }, []);

  return { settings, update };
}
