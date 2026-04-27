// Pure helpers for theme storage and resolution.
// No React imports here — used by both the inline FOUC script (transpiled)
// and the React provider.

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const STORAGE_KEY = "theme";

export function readStored(): Theme {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage unavailable (private mode) */
  }
  return "system";
}

export function writeStored(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* silent — theme still applies for the session */
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true; // SSR + no-preference both fall back to dark (current default)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

export function applyDomTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // Update <meta name="theme-color"> for mobile address bar.
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = resolved === "dark" ? "#050510" : "#fafaf7";
  if (meta) {
    meta.setAttribute("content", color);
  } else {
    const m = document.createElement("meta");
    m.name = "theme-color";
    m.content = color;
    document.head.appendChild(m);
  }
}
