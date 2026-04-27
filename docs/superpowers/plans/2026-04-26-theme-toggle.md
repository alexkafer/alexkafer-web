# Light / Dark Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent system-aware light/dark theme toggle, with a designed light palette and a hero-scene metaphor swap (suns ↔ planets).

**Architecture:** Rebind existing Tailwind color tokens to CSS variables flipped by `<html class="dark">`; provide an inline FOUC-prevention script; ship a fixed top-right toggle; thread `resolvedTheme` into the R3F hero scene to swap material/light/background props with a tweened cross-fade.

**Tech Stack:** Next.js 14 App Router, Tailwind 3.4, React 18, @react-three/fiber + drei, lucide-react, TypeScript, Cloudflare Workers (OpenNext).

**Spec:** `docs/superpowers/specs/2026-04-26-theme-toggle-design.md`

**Worktree:** `.worktrees/theme-toggle` on branch `feature/theme-toggle`. All commands assume `cwd = .worktrees/theme-toggle`.

---

## File Structure

| File | Purpose | Status |
|---|---|---|
| `tailwind.config.ts` | Add `darkMode: 'class'`; rewrite color values to consume CSS vars via `rgb(var(--…) / <alpha-value>)` | modify |
| `src/app/globals.css` | Declare `:root` (light) + `.dark` (dark) CSS-var blocks; selection/focus colors; reduced-motion transition rule | modify |
| `src/app/layout.tsx` | Inline FOUC script in `<head>`; wrap children in `<ThemeProvider>`; mount `<ThemeToggle>`; set `suppressHydrationWarning` on `<html>` | modify |
| `src/lib/theme.ts` | Pure helpers + types: `Theme`, `ResolvedTheme`, `STORAGE_KEY`, `readStored`, `writeStored`, `resolveTheme`, `applyDomTheme` | create |
| `src/lib/theme-provider.tsx` | `<ThemeProvider>` client component + `useTheme()` hook | create |
| `src/components/chrome/theme-toggle.tsx` | Fixed top-right 3-state toggle button | create |
| `src/components/hero/constellation-background.tsx` | Make vignette theme-aware via CSS var | modify |
| `src/components/hero/hero-scene.tsx` | Read `useTheme()`; per-frame tween a `themeBlend` ref; switch sphere material props, point-light color/intensity, line color, conditionally render `<Starfield />` | modify |
| `src/components/hero/planet-palette.ts` | Pure function returning a stable per-node planet color from the existing seed | create |
| `scripts/portless-theme-route.sh` | Optional helper to start the parallel dev instance under `alexkafer-theme` portless name | create |

---

## Conventions

- **Test framework:** This project has no UI test runner. "Test" steps in this plan are manual browser verification or `npm run lint` / `npm run build`. We do not add a new test framework (out of scope per spec).
- **Commit style:** Conventional commits, `feat:` / `chore:` / `fix:`. Always include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer.
- **Tailwind alpha syntax:** New color values use the `rgb(<r> <g> <b> / <alpha-value>)` form so existing `bg-cyan/30`-style utilities keep working. CSS-var values are space-separated RGB triplets, **not** `rgb()` strings.
- **Identifier names** (used across tasks; do not rename mid-plan):
  - `Theme = "light" | "dark" | "system"`
  - `ResolvedTheme = "light" | "dark"`
  - Storage key: `"theme"`
  - Hook: `useTheme()` returning `{ theme, resolvedTheme, setTheme }`
  - Hero theme context: `HeroThemeContext` exporting `useHeroTheme()` (mirrors `resolvedTheme`; lives in `hero-scene.tsx`)

---

## Task 1: Tailwind config — wire colors to CSS variables

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace the colors block and enable class-based dark mode**

Replace the entire contents of `tailwind.config.ts` with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "rgb(var(--color-void-900) / <alpha-value>)",
          900: "rgb(var(--color-void-900) / <alpha-value>)",
          800: "rgb(var(--color-void-800) / <alpha-value>)",
          700: "rgb(var(--color-void-700) / <alpha-value>)",
          600: "rgb(var(--color-void-600) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "rgb(var(--color-cyan) / <alpha-value>)",
          glow: "rgb(var(--color-cyan) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--color-amber) / <alpha-value>)",
        },
        mute: {
          100: "rgb(var(--color-mute-100) / <alpha-value>)",
          300: "rgb(var(--color-mute-300) / <alpha-value>)",
          500: "rgb(var(--color-mute-500) / <alpha-value>)",
          700: "rgb(var(--color-mute-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgb(var(--color-cyan) / 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Verify Tailwind compiles**

Run: `npx tailwindcss -i ./src/app/globals.css -o /tmp/tw-check.css --content "./src/app/**/*.tsx" 2>&1 | tail -5`
Expected: no errors. (Output file may be empty since globals.css doesn't exist yet at this point with the new vars; that's fine — what matters is no parse error from the config.)

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): wire Tailwind color tokens to CSS variables

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: globals.css — declare CSS variables for both themes

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with var-driven theme blocks**

Replace the full contents of `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Light theme (default). Values are space-separated RGB triplets so
   Tailwind's `rgb(var(--x) / <alpha-value>)` color recipe works. */
:root {
  --color-void-900: 250 250 247;  /* #fafaf7  page background */
  --color-void-800: 241 239 232;  /* #f1efe8  elevated surface */
  --color-void-700: 231 227 216;  /* #e7e3d8  secondary surface */
  --color-void-600: 220 214 198;  /* #dcd6c6  tertiary surface */
  --color-mute-100: 10 14 26;     /* #0a0e1a  primary text */
  --color-mute-300: 75 85 99;     /* #4b5563  secondary text */
  --color-mute-500: 107 114 128;  /* #6b7280  unchanged across themes */
  --color-mute-700: 203 209 217;  /* #cbd1d9  borders */
  --color-cyan:     2 132 199;    /* #0284c7  accent — AA on white */
  --color-amber:    180 83 9;     /* #b45309  accent — AA on white */

  /* Hero-scene-only tokens, consumed by Three.js via CSS var reads. */
  --hero-vignette: 250 250 247;   /* matches page bg for vignette fade */
  --hero-bg-gradient-from: 250 250 247;
  --hero-bg-gradient-to:   220 230 240;
}

.dark {
  --color-void-900: 5 5 16;       /* #050510 */
  --color-void-800: 10 14 26;     /* #0a0e1a */
  --color-void-700: 15 22 35;     /* #0f1623 */
  --color-void-600: 20 28 46;     /* #141c2e */
  --color-mute-100: 230 237 243;  /* #e6edf3 */
  --color-mute-300: 156 163 175;  /* #9ca3af */
  --color-mute-500: 107 114 128;  /* #6b7280 */
  --color-mute-700: 55 65 81;     /* #374151 */
  --color-cyan:     125 211 252;  /* #7dd3fc */
  --color-amber:    251 191 36;   /* #fbbf24 */

  --hero-vignette: 5 5 16;
  --hero-bg-gradient-from: 5 5 16;
  --hero-bg-gradient-to:   10 14 26;
}

html,
body {
  @apply bg-void;
}

body {
  @apply bg-void text-mute-100 font-sans antialiased;
  /* Smooth color transition when theme flips. */
  transition: background-color 250ms ease, color 250ms ease;
}

::selection {
  background: rgb(var(--color-cyan));
  color: rgb(var(--color-void-900));
}

*:focus-visible {
  outline: 2px solid rgb(var(--color-cyan));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  body {
    transition: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): declare light + dark CSS variable palettes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Theme storage + resolution helpers

**Files:**
- Create: `src/lib/theme.ts`

- [ ] **Step 1: Write `src/lib/theme.ts`**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/lib/theme" || echo "ok"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.ts
git commit -m "feat(theme): add storage and resolution helpers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: ThemeProvider + useTheme hook

**Files:**
- Create: `src/lib/theme-provider.tsx`

- [ ] **Step 1: Write `src/lib/theme-provider.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type ResolvedTheme,
  type Theme,
  applyDomTheme,
  readStored,
  resolveTheme,
  writeStored,
} from "./theme";

type Ctx = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initial state — overwritten on mount from localStorage. SSR renders
  // with "system"/"dark" so the inline FOUC script (which already ran) is
  // the source of truth for first paint; our JS state catches up on hydrate.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Hydrate from storage + apply.
  useEffect(() => {
    const stored = readStored();
    const resolved = resolveTheme(stored);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyDomTheme(resolved);
  }, []);

  // When user picks "system", track OS changes live.
  useEffect(() => {
    if (theme !== "system") return;
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(r);
      applyDomTheme(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeStored(t);
    const r = resolveTheme(t);
    setResolvedTheme(r);
    applyDomTheme(r);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "theme-provider" || echo "ok"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme-provider.tsx
git commit -m "feat(theme): add ThemeProvider and useTheme hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Inline FOUC-prevention script + layout integration

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add `suppressHydrationWarning`, the inline script, the provider, and the toggle mount**

Replace the `<html …>` and `<body>` block in `src/app/layout.tsx` (the function body of `RootLayout`) with:

```tsx
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(s==='light'||s==='dark')?s:(d?'dark':'light');if(r==='dark')document.documentElement.classList.add('dark');var c=r==='dark'?'#050510':'#fafaf7';var m=document.querySelector('meta[name=\\"theme-color\\"]');if(m){m.setAttribute('content',c);}else{var n=document.createElement('meta');n.name='theme-color';n.content=c;document.head.appendChild(n);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-cyan focus:px-4 focus:py-2 focus:text-void"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <ThemeToggle />
          <LenisProvider>{children}</LenisProvider>
        </ThemeProvider>
        <script
          type="application/x-ascii-art"
          dangerouslySetInnerHTML={{ __html: ASCII_EASTER_EGG }}
        />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add the imports at the top of `src/app/layout.tsx`** (alongside the existing imports)

```tsx
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
```

- [ ] **Step 3: Defer type-checking until after Task 6**

The `ThemeToggle` import will not resolve until Task 6 creates the file. Skip type-check here; we run it at the end of Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): inline FOUC script and mount ThemeProvider

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Theme toggle button

**Files:**
- Create: `src/components/chrome/theme-toggle.tsx`

- [ ] **Step 1: Write the toggle component**

```tsx
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
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | tail -20`
Expected: no errors.

Run: `npm run lint 2>&1 | tail -10`
Expected: no errors related to new files.

- [ ] **Step 3: Commit**

```bash
git add src/components/chrome/theme-toggle.tsx src/app/layout.tsx
git commit -m "feat(theme): add fixed top-right theme toggle button

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Theme-aware vignette overlay

**Files:**
- Modify: `src/components/hero/constellation-background.tsx`

- [ ] **Step 1: Replace the hardcoded vignette gradient with CSS-var-driven values**

Find the `style={{ background: "radial-gradient(ellipse at center, rgba(5,5,16,0) 0%, rgba(5,5,16,0.55) 60%, rgba(5,5,16,0.92) 100%)" }}` block and replace the entire `<div>` with:

```tsx
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgb(var(--hero-vignette) / 0) 0%, rgb(var(--hero-vignette) / 0.55) 60%, rgb(var(--hero-vignette) / 0.92) 100%)",
          transition: "background 250ms ease",
        }}
      />
```

- [ ] **Step 2: Build to verify no syntax breakage**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "constellation-background" || echo "ok"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero/constellation-background.tsx
git commit -m "feat(theme): drive hero vignette from CSS variables

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Planet palette helper

**Files:**
- Create: `src/components/hero/planet-palette.ts`

- [ ] **Step 1: Write the helper**

```ts
import * as THREE from "three";

// Five matte planet hues. Picked to read against a warm off-white sky and
// to look like a small solar system rather than a sample chart.
const PLANET_HEX = [
  "#5b6b8a", // slate blue
  "#a3623a", // rust
  "#c9b079", // sand
  "#7d8b6a", // sage
  "#8a4a3b", // ochre
];

const PLANET_COLORS = PLANET_HEX.map((h) => new THREE.Color(h));

// Stable per-node planet color. `seed` is the node index; using the
// existing index keeps each node's planet identity stable across renders
// and matches the existing `parkedColors` indexing convention.
export function planetColor(seed: number): THREE.Color {
  const i = ((seed % PLANET_COLORS.length) + PLANET_COLORS.length) %
    PLANET_COLORS.length;
  return PLANET_COLORS[i].clone();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "planet-palette" || echo "ok"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero/planet-palette.ts
git commit -m "feat(theme): add planet color palette for light-mode hero

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Hero scene — read theme + tween between suns and planets

This is the biggest task. Read it through fully before starting.

**Files:**
- Modify: `src/components/hero/hero-scene.tsx`

The scene will:
1. Read `useTheme()` once at the `<Scene />` root and pass `resolvedTheme` down to children that need it (Starfield gating, ConstellationNodes material switch, ConstellationLinks color, point light props).
2. Maintain a `themeBlend` `useRef<number>` (0 = dark, 1 = light) and lerp it toward the target value each frame in `ConstellationNodes`'s `useFrame` (it already has one). Duration target: ~400 ms → use a per-frame lerp factor of `0.06` (close enough at 60fps).
3. Use the blend to interpolate `emissiveIntensity` (cyan glow strength) and the per-node base color (cyan ↔ planet hue), and to fade the point-light intensity / color and line opacity.
4. Conditionally skip rendering `<Starfield />` when `resolvedTheme === "light"`.

- [ ] **Step 1: Add the import for `useTheme` and `planetColor` at the top of `hero-scene.tsx`** (alongside the existing imports — keep them grouped with the other internal imports)

```tsx
import { useTheme } from "@/lib/theme-provider";
import type { ResolvedTheme } from "@/lib/theme";
import { planetColor } from "./planet-palette";
```

- [ ] **Step 2: Add a hero-scoped theme context**

First, ensure `createContext` and `useContext` are added to the existing `react` import line at the top of the file (do **not** add a duplicate `import` statement). Example: change `import { useEffect, useMemo, useRef } from "react";` (or whatever is currently imported) to `import { createContext, useContext, useEffect, useMemo, useRef } from "react";`.

Then, just below the existing constants block (after `const BASE_LERP = 0.08;`), add:

```tsx
const HeroThemeContext = createContext<ResolvedTheme>("dark");
function useHeroTheme(): ResolvedTheme {
  return useContext(HeroThemeContext);
}
```

- [ ] **Step 3: In the `Scene()` function, pull `resolvedTheme` and wrap the returned tree with the provider**

Find the `return (` block inside `function Scene()` and change it to:

```tsx
  const { resolvedTheme } = useTheme();

  return (
    <HeroThemeContext.Provider value={resolvedTheme}>
      <ambientLight intensity={resolvedTheme === "light" ? 0.6 : 0.4} />
      <pointLight
        position={[6, 4, 6]}
        intensity={resolvedTheme === "light" ? 1.1 : 0.6}
        color={resolvedTheme === "light" ? "#fff4d6" : "#7dd3fc"}
      />
      <PointerTracker cursor={cursor} />
      {resolvedTheme === "dark" && <Starfield />}
      <ConstellationNodes
        nodes={nodes}
        cursor={cursor}
        spread={spread}
        nodeSize={nodeSize}
        cursorRadius={cursorRadius}
        cursorStrength={cursorStrength}
        positionsRef={positionsRef}
        reduced={reduced}
        assignment={assignment}
        parkedColors={parkedColors}
      />
      <ConstellationLinks
        nodes={nodes}
        positionsRef={positionsRef}
        spread={spread}
        linkDistance={linkDistance}
        assignment={assignment}
      />
      <SectionLinks
        positionsRef={positionsRef}
        assignment={assignment}
        neighborPairs={neighborPairs}
        parkedColors={parkedColors}
      />
    </HeroThemeContext.Provider>
  );
```

- [ ] **Step 4: Modify `ConstellationNodes` to blend material props by theme**

Inside `ConstellationNodes`, immediately above the `useFrame(...)` call that updates per-node materials (the one that does `colorTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend)`), add:

```tsx
  const heroTheme = useHeroTheme();
  const themeBlend = useRef(heroTheme === "light" ? 1 : 0);
  const planetTargets = useMemo(
    () => parkedColors.map((_, i) => planetColor(i)),
    [parkedColors],
  );
  const planetTmp = useRef(new THREE.Color());
  const sunTmp = useRef(new THREE.Color());
```

Then inside that `useFrame` block, **before** the existing `refs.current.forEach(...)` loop, advance the blend:

```tsx
    const targetBlend = heroTheme === "light" ? 1 : 0;
    themeBlend.current += (targetBlend - themeBlend.current) * 0.06;
    const tb = themeBlend.current; // 0 = sun (dark), 1 = planet (light)
```

Then **inside** that `forEach` loop, replace the existing material-update lines:

```tsx
      // Color: blend cloud color → parked color by (1 - heroBlend).
      const mat = mesh.material as THREE.MeshStandardMaterial;
      colorTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend);
      mat.color.copy(colorTmp.current);
      mat.emissive.copy(colorTmp.current);
      mat.emissiveIntensity =
        isActiveStar && anchorPos ? ACTIVE_EMISSIVE : BASE_EMISSIVE;
      mat.transparent = true;
      mat.opacity = 1;
```

with:

```tsx
      const mat = mesh.material as THREE.MeshStandardMaterial;

      // Sun-mode color (dark theme): existing cloud→parked blend.
      sunTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend);
      // Planet-mode color (light theme): stable planet hue, no cloud blend.
      planetTmp.current.copy(planetTargets[i]);

      // Lerp final color between the two metaphors using themeBlend.
      colorTmp.current.copy(sunTmp.current).lerp(planetTmp.current, tb);
      mat.color.copy(colorTmp.current);

      // Emissive: full sun glow at tb=0; black at tb=1 (planets don't glow).
      mat.emissive.copy(sunTmp.current).multiplyScalar(1 - tb);
      const baseEmis =
        isActiveStar && anchorPos ? ACTIVE_EMISSIVE : BASE_EMISSIVE;
      mat.emissiveIntensity = baseEmis * (1 - tb);

      // Surface: rougher / less metallic in planet mode.
      mat.roughness = 0.4 + tb * 0.5;   // 0.4 → 0.9
      mat.metalness = 0.1 - tb * 0.05;  // 0.1 → 0.05
      mat.transparent = true;
      mat.opacity = 1;
      mat.needsUpdate = true;
```

- [ ] **Step 5: Modify `ConstellationLinks` to dim and recolor in planet mode**

Inside `ConstellationLinks`, just above the `useFrame(...)` call (or top of the function body if there isn't one), add:

```tsx
  const heroTheme = useHeroTheme();
  const linkBlend = useRef(heroTheme === "light" ? 1 : 0);
```

Inside that component's existing `useFrame(...)` (the one that updates the cyan filaments — it sits per-line), at the start of the frame callback add:

```tsx
    const targetBlend = heroTheme === "light" ? 1 : 0;
    linkBlend.current += (targetBlend - linkBlend.current) * 0.06;
    const lb = linkBlend.current;
```

Then dim line opacity in planet mode. The current code in `ConstellationLinks`'s frame callback (in `SectionLinks` — note: there are **two** Line groups; this step targets `SectionLinks`) reads:

```tsx
        obj.material.opacity = isActive ? 0.45 * sectionFade : 0;
```

Replace it with:

```tsx
        obj.material.opacity = (isActive ? 0.45 * sectionFade : 0) * (1 - lb * 0.65);
```

The hero-pair `<Line>` group in the separate `ConstellationLinks` function (the one that renders cyan filaments at constant `opacity={0.55}` in JSX) does not need a per-frame change in V1 — they fade to zero on scroll out of the hero section anyway. **Skip** modifying that component for this task; only `SectionLinks` is updated. (If reviewers later want hero-pair lines dimmed in light mode too, that's a small follow-up.)

For the changes above to compile, also add the same `useHeroTheme` + `linkBlend` ref pair at the top of the **`SectionLinks`** function body (not `ConstellationLinks`). Re-listing for clarity:

```tsx
  const heroTheme = useHeroTheme();
  const linkBlend = useRef(heroTheme === "light" ? 1 : 0);
```

And inside that frame callback, before the `allPairs.forEach(...)`:

```tsx
    const targetBlend = heroTheme === "light" ? 1 : 0;
    linkBlend.current += (targetBlend - linkBlend.current) * 0.06;
    const lb = linkBlend.current;
```

Correct the previous step's component name reference: the per-pair-opacity loop lives in `SectionLinks`, not `ConstellationLinks`. Apply the `heroTheme`/`linkBlend`/`lb` additions to **`SectionLinks`** only.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "hero-scene" || echo "ok"`
Expected: `ok`.

- [ ] **Step 7: Commit**

```bash
git add src/components/hero/hero-scene.tsx
git commit -m "feat(theme): swap hero scene between suns and planets

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Constellation background gradient (optional polish)

**Files:**
- Modify: `src/components/hero/constellation-background.tsx`

The Three.js Canvas itself uses `style={{ background: "transparent" }}`, so the page bg shows through and themes automatically via Task 2. No code change needed here — this task is verification.

- [ ] **Step 1: Confirm no further changes needed**

Run: `grep -n "background" src/components/hero/constellation-background.tsx src/components/hero/hero-scene.tsx`
Expected: only the vignette (already var-driven) and the `style={{ background: "transparent" }}` on the `<Canvas>`. If you see other hardcoded color backgrounds, replace them with var-driven equivalents using the same pattern as Task 7.

- [ ] **Step 2: No commit needed unless changes were made.**

---

## Task 11: Dev-server verification on a parallel portless route

**Files:** none (operational task)

The goal is to run the new build alongside the live one, at `https://alexkafer-theme.localhost:1355`, so they can be A/B'd in two browser tabs.

- [ ] **Step 1: Confirm the existing portless proxy is up**

Run: `portless ls 2>/dev/null`
Expected: shows the proxy on port 1355. If not, start it: `portless proxy start --port 1355 --https`.

- [ ] **Step 2: Confirm node_modules in the worktree resolve**

Run: `ls node_modules/next > /dev/null && echo ok`
Expected: `ok`. (The worktree was set up with a symlink to the main `node_modules`; if missing, run `npm install`.)

- [ ] **Step 3: Start the parallel dev server under the `alexkafer-theme` portless name**

Run:

```bash
nohup portless alexkafer-theme next dev > /tmp/portless-theme.log 2>&1 &
sleep 6
curl -skI https://alexkafer-theme.localhost:1355/ | head -1
```

Expected: `HTTP/2 200` (or `HTTP/2 307` if the app issues a redirect — also fine; what matters is that it's reachable).

- [ ] **Step 4: Tail the log and check for compile errors**

Run: `tail -50 /tmp/portless-theme.log`
Expected: Next.js "compiled client and server successfully" / "Ready in …", no red errors.

- [ ] **Step 5: Manual visual verification (in browser)**

Open `https://alexkafer-theme.localhost:1355/` in a browser. In a second tab open `https://alexkafer.localhost:1355/` (the existing live instance) for A/B comparison. Verify:

  - Default load matches OS theme.
  - Toggle in top-right cycles system → light → dark → system; icon updates accordingly.
  - Reload preserves the chosen theme; no flash of the wrong colors during reload (test with DevTools → Network → "Slow 3G" throttling).
  - Dark mode is **visually identical** to the live tab (no regressions).
  - Light mode: page bg is warm off-white; text is dark and legible across hero, demos, ab-test, resume, and footer sections.
  - Hero scene: dark = cyan-glow suns + visible starfield; light = matte planets in varied hues, no starfield, warmer light.
  - Theme transition: ~250 ms color tween for chrome; ~400 ms cross-fade for scene materials.
  - macOS System Settings → Appearance change while toggle is on `system` flips the page live.
  - Reduced motion (System Settings → Accessibility → Display → Reduce motion): transitions become instant.

- [ ] **Step 6: Lint + production build sanity-check**

Run: `npm run lint 2>&1 | tail -20`
Expected: no errors.

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds. Any warnings should be pre-existing (compare against a `main`-branch build if unsure).

- [ ] **Step 7: Stop the parallel dev server when done reviewing**

Run:

```bash
pgrep -fl "next dev" | grep theme || true
# Find the theme-route PID and kill it specifically — do NOT kill the live alexkafer one.
```

Then `kill <PID>` for the theme dev process only.

---

## Self-Review Checklist (run before handoff)

Before declaring the plan ready, walk through:

1. **Spec coverage:**
   - Light palette declared → Task 2 ✓
   - Manual + system + persistence → Tasks 3, 4 ✓
   - FOUC prevention → Task 5 ✓
   - Toggle UI top-right with safe-area → Task 6 ✓
   - Hero suns/planets metaphor → Task 9 ✓
   - Starfield hidden in light mode → Task 9 step 3 ✓
   - Smooth ~250 ms color + ~400 ms scene cross-fade → Tasks 2, 9 ✓
   - Reduced-motion handling → Task 2 (CSS) ✓ (scene tween still happens but is short and non-disruptive — acceptable per spec)
   - Parallel portless route for visual A/B → Task 11 ✓

2. **No placeholders.** Every task has either complete code or a precise diff target.

3. **Identifier consistency.** `Theme`, `ResolvedTheme`, `useTheme`, `STORAGE_KEY = "theme"`, `useHeroTheme`, `planetColor` — used identically wherever they appear.

4. **Open follow-ups** (called out, intentionally not in this plan):
   - Migrating component class names from `void-*`/`mute-*` to truly semantic names (`surface-*`/`fg-*`).
   - Theming the OG / Twitter image generators.
   - Planet textures, rings, atmosphere shaders.
   - Reduced-motion: also hard-snap the scene tween (currently it animates briefly).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-26-theme-toggle.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task with two-stage review.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batched with checkpoints.

Which approach?
