"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // Always flip to the opposite of what's currently showing. After the first
  // click the stored value is "light" or "dark" (never "system" again), so
  // the user's pick sticks.
  const next = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-sm text-cyan/70 transition hover:text-cyan focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
    >
      <Icon size={12} aria-hidden />
    </button>
  );
}
