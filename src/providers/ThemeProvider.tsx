/**
 * ThemeProvider.tsx — Applies dark/light/system theme to the document root.
 *
 * Reads `darkMode` from the settings store ('system' | 'light' | 'dark').
 * Adds/removes the 'dark' class on <html> and listens to the system
 * prefers-color-scheme media query when mode is 'system'.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/store/settings";

// ---------------------------------------------------------------------------
// Helper — applies 'dark' class based on resolved preference
// ---------------------------------------------------------------------------

function applyTheme(mode: "system" | "light" | "dark"): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = mode === "dark" || (mode === "system" && prefersDark);

  if (shouldBeDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const darkMode = useSettingsStore((s) => s.darkMode);

  useEffect(() => {
    // Apply immediately whenever the setting changes
    applyTheme(darkMode);

    // Only wire up the system-preference listener in 'system' mode
    if (darkMode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [darkMode]);

  return <>{children}</>;
}
