import { useEffect } from "react";
import type { Theme } from "../lib/settings";

/** Applies the Theme setting to <html>; base.css reads data-theme. undefined while settings load. */
export function useTheme(theme: Theme | undefined) {
  useEffect(() => {
    if (theme === undefined) return;
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
}
