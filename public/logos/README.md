# Résumé logos

Drop monochrome SVGs here. The Résumé section in
`src/components/sections/disguise.tsx` references these files by exact
filename. Until a file exists, the section renders a placeholder block
in the logo's footprint — caption text still reads.

## Filename contract

| Slug              | Used for                          |
| ----------------- | --------------------------------- |
| `xbox.svg` *(or `xbox-white.svg` / `xbox-black.svg`)* | Xbox (Microsoft) — current role |
| `umn.svg`         | University of Minnesota           |
| `microsoft.svg`   | Microsoft (internship, 2019)      |
| `nasa.svg`        | NASA Johnson Space Center         |
| `polaris.svg`     | Polaris Inc.                      |
| `first-2526.svg`  | FIRST Robotics Team 2526          |
| `mit-launch.svg`  | MIT Launch                        |

If a logo only ships as a fixed-color asset (e.g. `fill="white"` instead
of `fill="currentColor"`), commit both light and dark variants and point
the entry at the correct one via the `logoSrc` field on the entry in
`src/components/sections/disguise.tsx`. The site is dark-themed, so the
white variant is usually correct.

## Style guidelines

- Monochrome — paths use `fill="currentColor"` (or no fill at all) so
  Tailwind text color tints them.
- Normalized `viewBox`, no fixed `width`/`height` attributes.
- Target visual height ~32px; aspect ratio determines width.
- Strip `<title>` / `<desc>` — the surrounding `<img alt>` handles a11y.
