# Light / Dark Theme Toggle — Design Spec

**Date:** 2026-04-26
**Branch:** `feature/theme-toggle`
**Worktree:** `.worktrees/theme-toggle`

## Problem

The site is currently dark-only. We want a first-class light theme alongside
the existing dark theme, with a persistent user-controllable toggle that also
respects the OS `prefers-color-scheme` setting by default.

The hero 3D scene is a centerpiece visual whose cyan-glow "node" metaphor only
reads as intended on a dark background. Rather than fight that, the scene gets
a **theme-specific metaphor**: orbiting **suns** in dark mode, orbiting
**planets** in light mode.

## Goals

- A deliberately designed light palette that is a peer to the current dark
  palette (not a mechanical inversion).
- Manual toggle that persists in `localStorage`; defaults to OS preference;
  reacts live to OS changes when in `system` mode.
- Zero flash of incorrect theme on first paint (FOUC).
- Minimal markup churn — existing color utility classes keep working.
- Hero scene visually distinct per theme (suns vs planets) without rewriting
  the underlying scene graph.
- Smooth ~250 ms color transition for chrome; ~400 ms cross-fade for scene
  materials.

## Non-Goals (V1)

- Per-component `dark:` Tailwind variants (we go the CSS-variable route).
- Full token rename to semantic names (`surface`, `fg`, `border`). Can be
  done incrementally later; out of scope here.
- Planet textures, rings, atmosphere shaders. Planets are solid-colored
  matte spheres in V1.
- A theme transition animation beyond a CSS color tween.
- Persisting theme across devices (localStorage only, no server-side cookie).
- Theming the OG / Twitter image generators (they remain dark, brand-static).

## Approach

### Token strategy: CSS variables behind existing Tailwind names

Rebind the existing Tailwind color tokens (`void-*`, `mute-*`, `cyan`, `amber`)
to CSS custom properties. Two value sets are declared in `globals.css` — one
under `:root` (light defaults) and one under `.dark` (dark values matching
today's exact palette so dark mode is byte-identical to current).

This means no component markup changes. Every `bg-void-800`, `text-mute-100`,
`border-cyan/30` etc. continues to work and themes automatically.

Considered alternatives:

- **Per-component `dark:` variants** — would touch 10+ files and 30+ unique
  utility classes; high churn and easy to miss a spot.
- **Rename to fully semantic tokens** — cleanest long-term but unnecessary
  diff for a toggle. Can be done incrementally as a follow-up.

### Class strategy

Use Tailwind's built-in `darkMode: 'class'` option. The active theme is
expressed as `<html class="dark">` (or absent). All variants and tokens
flip atomically on a single element.

### FOUC prevention

A small inline script in `<head>` runs before any paint. It reads
`localStorage.getItem('theme')` and `window.matchMedia('(prefers-color-scheme: dark)')`
and applies the `dark` class to `<html>`. The script is hand-minified and
inlined directly via `dangerouslySetInnerHTML` so it ships in the SSR HTML.

### State / API

- Storage key: `theme`. Allowed values: `"light" | "dark" | "system"`.
- Default: `"system"`.
- A `ThemeProvider` (client component) exposes `{ theme, resolvedTheme, setTheme }`
  via React context. `theme` is the user's chosen mode (incl. `system`);
  `resolvedTheme` is the actually-applied `light | dark` after resolving
  `system`. Components that change visuals based on the active theme
  (the hero scene) read `resolvedTheme`.
- When `theme === 'system'`, the provider subscribes to `matchMedia` change
  events and re-applies in real time.

### Toggle UI

- Component: `src/components/chrome/theme-toggle.tsx`.
- Position: `position: fixed`, top-right, with safe-area insets respected.
- Behavior: cycles `system → light → dark → system`.
- Visual: lucide-react icon (`Sun` for light-active, `Moon` for dark-active,
  `MonitorCog` for system). 36×36 px hit target, subtle border, hover state
  uses existing token classes so it themes automatically.
- A11y: `<button>` with `aria-label` reflecting next state ("Switch to light
  theme"), `aria-pressed` not used (3-state cycle, not toggle); `title`
  attribute mirrors aria-label.

### Hero scene — suns vs planets

The scene already supports per-node colors and per-node materials. We thread
`resolvedTheme` from the provider into the scene root via context (avoids
prop-drilling through `<Canvas>`). The scene then switches:

| Aspect              | Dark (suns)                                        | Light (planets)                                              |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Sphere material     | `MeshStandardMaterial`, `emissive: cyan`, `emissiveIntensity: BASE_EMISSIVE` | `MeshStandardMaterial`, `emissive: black`, `emissiveIntensity: 0`, `roughness: 0.9`, `metalness: 0.05` |
| Node base color     | cyan glow (`#7dd3fc`)                              | varied palette (slate-blue, rust, sand, sage, ochre) seeded from existing per-node hash so each "planet" is stable across renders |
| Point light         | `#7dd3fc`, intensity `0.6`                         | warm `#fff4d6`, intensity `1.1`, positioned to give planets a clear lit/shadow side |
| Connection lines    | cyan filaments at current opacity                  | dashed neutral arcs (`#475569`) at lower opacity (orbit-trail feel) |
| Starfield (1500 pts)| visible (current)                                  | hidden (`<points>` not rendered when `resolvedTheme === 'light'`) |
| Constellation bg    | unchanged dark gradient                            | soft sky gradient (warm white → pale blue)                   |
| Tooltip text color  | mute-100 (token-driven, automatic)                 | mute-100 (token-driven, automatic)                           |

Material cross-fade (~400 ms) when `resolvedTheme` changes: tween a
`themeBlend` ref via `useFrame` and lerp `emissiveIntensity`, base color, and
light intensity from old → new values. Lines and starfield use opacity tween.

### Light palette

| Token             | Dark (today) | Light (new) | Notes                              |
| ----------------- | ------------ | ----------- | ---------------------------------- |
| `void` / `void-900` | `#050510`  | `#fafaf7`   | warm off-white page bg             |
| `void-800`        | `#0a0e1a`    | `#f1efe8`   | elevated surface                   |
| `void-700`        | `#0f1623`    | `#e7e3d8`   | secondary surface                  |
| `void-600`        | `#141c2e`    | `#dcd6c6`   | tertiary surface                   |
| `mute-100`        | `#e6edf3`    | `#0a0e1a`   | primary text (deep ink)            |
| `mute-200`        | `(implied)`  | `#1f2937`   | (used in one place; matches hover) |
| `mute-300`        | `#9ca3af`    | `#4b5563`   | secondary text                     |
| `mute-500`        | `#6b7280`    | `#6b7280`   | unchanged (sits AA on both)        |
| `mute-700`        | `#374151`    | `#cbd1d9`   | borders / dividers                 |
| `cyan`            | `#7dd3fc`    | `#0284c7`   | deeper cyan, AA contrast on white  |
| `amber`           | `#fbbf24`    | `#b45309`   | deeper amber, AA contrast on white |

Selection background and `*:focus-visible` outline read the active
`--color-cyan` so they flip automatically.

`<meta name="theme-color">` initial SSR value stays `#050510` (dark), and the
inline FOUC script updates it to the resolved theme's bg color before paint.

## Components / Files Touched

```
tailwind.config.ts            -- darkMode: 'class'; colors → rgb(var(--x) / <alpha-value>)
src/app/globals.css           -- :root + .dark CSS-var blocks; transition rules
src/app/layout.tsx            -- inline FOUC script in <head>; mount <ThemeProvider> + <ThemeToggle>
src/lib/theme.ts              -- types + storage helpers (getStored / setStored / resolve)
src/lib/theme-provider.tsx    -- client ThemeProvider context + useTheme() hook
src/components/chrome/theme-toggle.tsx  -- fixed top-right toggle button
src/components/hero/hero-scene.tsx      -- read useTheme(); switch material props + light + lines + starfield
src/components/hero/constellation-background.tsx  -- swap gradient per resolvedTheme
src/components/hero/lab-color.ts        -- planet palette function (used in light mode)
docs/superpowers/specs/2026-04-26-theme-toggle-design.md  -- this file
```

No changes to: route handlers, OG image generators, AB-test logic, demos
content, footer text content, fonts.

## Data Flow

```
SSR HTML
  └─ <head> inline script reads localStorage + matchMedia → sets <html class="dark"?>
  └─ <body> renders with correct token values from first paint
       └─ <ThemeProvider> hydrates, hooks up matchMedia listener if theme=system
            ├─ <ThemeToggle> reads { theme, setTheme }, cycles on click
            └─ <HeroScene> reads { resolvedTheme }, tweens materials/lights/lines
```

## Error / Edge Cases

- **localStorage unavailable** (private browsing in some browsers): inline
  script wraps the read in try/catch; falls back to `system`. The provider
  also try/catches its writes; failed writes are silent (theme still applied
  for the session).
- **JS disabled**: inline script doesn't run; the SSR HTML renders dark
  (current behavior). Acceptable — the toggle is a JS feature.
- **`prefers-color-scheme: no-preference`**: treated as `dark` (matches
  current default). Documented in `theme.ts`.
- **Fast theme thrash** (user spams the toggle): scene tween is interruptible
  via the `themeBlend` ref; CSS color transitions naturally handle interruption.
- **Reduced motion** (`prefers-reduced-motion: reduce`): set CSS transition
  duration to `0ms` and skip the scene material tween (snap instead).
- **Hero scene unmounted** while tween is running: `useFrame` is
  unsubscribed automatically by R3F; no leaked listeners.

## Testing / Verification

This is a visual feature. Verification is primarily manual A/B in browser:

1. Run the new instance on a dedicated portless route `alexkafer-theme` so it
   sits at `https://alexkafer-theme.localhost:1355` alongside the live
   `https://alexkafer.localhost:1355`. Open both in side-by-side tabs.
2. Verify:
   - Dark mode is visually identical to current site (no regressions).
   - Light mode renders all sections legibly; no white-on-white or
     black-on-black anywhere.
   - Toggle cycles system → light → dark → system; OS preference change
     while in `system` flips the theme live.
   - Reload preserves the chosen theme; no FOUC on reload (test with Network
     throttled to "Slow 3G").
   - Hero scene shows suns in dark, planets in light; transition is smooth.
   - Reduced-motion respects (System Preferences → Display).
3. Lint: `npm run lint` must pass.
4. Build: `npm run build` must succeed.

No new automated tests are added; the project does not currently have a UI
test runner, and adding one is out of scope.

## Open Risks

- **Light-mode contrast for cyan/amber accents**: chosen deeper shades
  (`#0284c7`, `#b45309`) hit AA on white but are slightly less vivid than
  the dark variants. If they read as "muddy" in review, consider dropping
  to `#0369a1` and `#92400e`.
- **Planet palette aesthetic**: solid-color matte spheres may look "toy-like"
  next to the original glowing-node aesthetic. If review rejects, the
  fallback is "always dark" hero (dark canvas section even in light mode).
- **Performance**: adding a per-frame `themeBlend` lerp on N node materials
  is cheap (already iterating them each frame), but if any device shows
  jank, gate the tween behind `prefers-reduced-motion: no-preference` and
  shorten to 200 ms.
