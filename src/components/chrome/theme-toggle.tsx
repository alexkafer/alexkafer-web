"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import type { Theme } from "@/lib/theme";

const NEXT: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<Theme, string> = {
  system: "Switch to light theme",
  light: "Switch to dark theme",
  dark: "Use system theme",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      className="fixed right-4 top-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-mute-700/60 bg-void-800/70 text-mute-100 shadow-glow backdrop-blur transition hover:bg-void-700/90 focus-visible:outline-none"
      style={{
        // Respect device safe-area on iOS notched devices.
        right: "max(1rem, env(safe-area-inset-right))",
        top: "max(1rem, env(safe-area-inset-top))",
      }}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
