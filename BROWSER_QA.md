# Browser QA Checklist

Manual smoke tests to run before declaring a release green. Automated checks
(`npm run build`, `npm run lint`, `npx tsc --noEmit`) all pass; the items below
require a human at a real browser.

## Browsers

- [ ] Chrome (latest, macOS/Windows)
- [ ] Safari (latest, macOS)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS 17+)
- [ ] Chrome Android (latest)

## Per-browser interactions

- [ ] Hero R3F canvas renders; nodes orbit; cursor gravity nudges nearest node
- [ ] Hero node hover tooltip appears with mock metadata
- [ ] HUD top strip shows live `T+` counter; status pill ticks plausible numbers
- [ ] Lenis smooth-scroll feels smooth (no jank, no double-scroll)
- [ ] Each section's scroll-driven animation triggers at the right viewport position:
  - [ ] Résumé — x-ray overlay
  - [ ] Scale — counters animate to 9 / 100M / 100+
  - [ ] Velocity — months → weeks bar drains
  - [ ] Reliability — 99.9% gauge fills, 200-tile grid lights green
  - [ ] Efficiency — $2.2M counter rolls, 5-bar chart draws
  - [ ] Reach — Web / SmartTV / Quest endpoints light sequentially
  - [ ] Origin — NASA-JSC marker, NLP timeline shrinks 6mo → 1wk
  - [ ] Principles — three cards tilt under cursor
- [ ] Footer renders: email, LinkedIn, GitHub icons; auto-year correct

## Easter eggs

- [ ] `?` key opens devtools overlay; FPS / scroll % / viewport / build SHA visible
- [ ] Konami code (↑↑↓↓←→←→BA) reveals hidden console panel under footer
- [ ] View-source shows ASCII art comment in `<head>`

## Accessibility

- [ ] Tab order is logical; focus rings visible (2px cyan)
- [ ] Skip-to-content link appears on first Tab press
- [ ] `prefers-reduced-motion: reduce` (System Settings → Accessibility) disables:
  - [ ] Pinned scroll triggers
  - [ ] Hero canvas animation (or replaces with static fallback)
  - [ ] Section-level scroll animations
- [ ] Screen reader (VoiceOver / NVDA) reads hidden narrative under `<main>`

## Network / perf

- [ ] First Load JS for `/` ≈ 196 kB (target <250 kB)
- [ ] Lighthouse desktop ≥ 90 (Performance / Accessibility / Best Practices / SEO)
- [ ] Lighthouse mobile ≥ 80
- [ ] OG image renders in LinkedIn / Twitter / Slack link previewer
