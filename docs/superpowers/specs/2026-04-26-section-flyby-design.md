# Section-Flyby Constellation — Design

**Date:** 2026-04-26
**Status:** Proposed
**Supersedes (partially):** `2026-04-25-labs-orb-design.md` — keeps the lab manifest concept, replaces the orbital sphere + per-section layout morphing with a fly-by model.

## Problem

The `feature/labs-orb` branch built a 3D rotating-sphere constellation that frames the active lab star in a fixed top-corner slot as the user scrolls. The visual style of the original `main` branch (drifting page-spanning constellation cloud) is preferred. Additionally, the scroll behavior should evoke "joining the orbital journey of a celestial body" — the section's star should travel through the viewport alongside the section content, not rotate into a fixed slot.

## Approach

Restore `main`'s hero constellation visual for the home view. Replace the per-section layout morphing with a per-section **flyby star**: a single, lab-colored point that enters from off-screen below, drifts up alongside the section header, and exits off-screen above as the user scrolls past. The base constellation hides during section view, so each section feels like a brief fly-by encounter rather than a constellation reframing.

## Cherry-pick Plan

Bring forward from `feature/labs-orb`:
- `src/labs/manifest.ts`, `src/labs/types.ts`, `src/labs/index.ts` — per-lab metadata (slug, version, title, blurb, status, tags, color, order)
- The `LABS` sorted array as the canonical section list (replaces `SECTIONS` in `section-layouts.ts`)

Discard from `feature/labs-orb`:
- `Orb`, `OrbLinks`, `Starfield`-orb-variant in `hero-scene.tsx`
- `sphere-positions.ts`, `use-drag-orbit.ts`, `label-state.ts`
- The orbital ring / framing-anchor system
- Per-section layout morphing in `section-layouts.ts` (only `cloud` for hero is needed; the rest of the layouts are no longer used)

## Modes

### Hero mode (`activeIndex === 0`)
- Full page-spanning constellation rendered from `main`'s `hero-scene.tsx`: ~12 LiveNodes drift in a cloud layout with Lissajous wobble + cursor parallax
- Background `Starfield` + faint links between near-neighbors (KNN edges)
- Identical to current `main` look — no behavior change

### Section mode (`activeIndex > 0`)
- All constellation nodes fade to opacity 0 (`heroBlend → 0`)
- KNN links also fade to 0
- Background `Starfield` stays at reduced opacity (~0.4) for cosmic atmosphere
- A single **FlybyStar** for `LABS[activeIndex]` becomes visible
- During the brief blend window between two sections, the outgoing flyby fades while the incoming one fades in — they may overlap on screen for ~10% of section progress

### FlybyStar — geometry & motion
For section index `i ≥ 1` with per-section scroll progress `t ∈ [0, 1]` (0 = section just entered viewport bottom, 1 = section just left viewport top):

- **y(t)**: linear from `-1.15 * halfH` (off-screen below) to `+1.15 * halfH` (off-screen above). Slight ease-in-out for organic feel.
- **x(t)**: lab side determined by `i % 2` — odd → left, even → right. Within the assigned side, x sweeps gently *toward center* as the star rises (`x = side * halfW * (0.65 - 0.15 * t)`), so the star arcs slightly inward past the section header before exiting.
- **z(t)**: small sinusoidal nudge `0.3 * sin(t * π)` so the star looks like it's actually orbiting in 3D, not sliding on a 2D plane.
- **scale**: peaks at `t = 0.5` (largest as it passes the header), tapers at entry/exit.
- **color**: from `LABS[i].meta.color` (or fallback cyan).

### Comet trail (thin glowing line)
- A `THREE.Line` (additive blending, 1–2 px) following the most-recent N positions of the FlybyStar (N ≈ 30 frames)
- Per-vertex opacity ramps from 1.0 at the head to 0.0 at the tail (`vertexColors`)
- When a flyby fades out (section transition), the trail fades with it
- No persistent trails between sections — each FlybyStar owns its own trail

## Components & Files

```
src/components/hero/
  hero-scene.tsx           # restored from main, extended with FlybyStar
  scroll-state.ts          # extended with sectionProgress(activeIdx)
  use-hero-nodes.ts        # restored from main
  section-layouts.ts       # reduced to `cloud` only (for hero mode), or inlined
  hud-chrome.tsx           # restored from main (or kept from labs-orb if preferred)
  hero-copy.tsx            # restored from main
  hero-cta-row.tsx         # restored from main
  status-pill.tsx          # restored from main
  node-tooltips.tsx        # restored from main
  constellation-background.tsx  # restored from main (no ActiveLabLabel)

src/labs/                  # NEW (cherry-picked from labs-orb)
  manifest.ts
  types.ts
  index.ts
```

`src/components/hero/hero-scene.tsx` gains a new internal component:

```tsx
function FlybyStar({ idx, progress, opacity, viewport }) {
  // returns <mesh> + <line> (trail) for one section's flyby
}
```

The top-level `Scene` renders:
- `<Constellation />` (hero nodes) with opacity = `heroBlend`
- For each section i ≥ 1, optionally `<FlybyStar i={i} ... />` with opacity = `1 - heroBlend` while it's the active or transitioning section
- (For perf: only mount the active and next FlybyStar at any given time.)

## Scroll State Extension

Current `scroll-state.ts` exposes `{ activeIndex, nextIndex, blend, progress }`. Add:

- `sectionProgress: number` — 0→1 within the *current section's* scroll range (i.e., 0 when the section's top hits the viewport bottom, 1 when the section's bottom hits the viewport top)
- The blend between activeIndex/nextIndex is already handled; FlybyStar consumes `sectionProgress` directly

This is computed off the section DOM positions — same approach as the existing `progress` field but normalized per section, not per-screen-quarter.

## Side Selection

`i % 2 === 1 ? -1 : +1` (odd sections left, even right). First lab section is index 1 (disguise) → left. The ordering matches `LABS` (sorted by `meta.order`).

If a section's header content sits on the right (e.g., right-aligned), the side picker can be overridden per-lab by adding `flybySide?: "left" | "right"` to `LabMeta`. Default is parity-based.

## Performance Notes

- Only the active and next FlybyStar are mounted in section view (max 2 stars + 2 trails)
- Constellation nodes already exist in main and are not re-instantiated
- Trail is a single `BufferGeometry` with `setDrawRange` updated each frame — no allocations in `useFrame`
- Comet trail caps at ~30 vertices

## Testing & Verification

- Manual via `npm run dev` (port 3003 in worktree)
- Playwright-cli screenshots at hero, section 1, section 5, last section
- Verify hero view is visually identical to `main`
- Verify each section's flyby star color matches its lab color
- Verify left/right alternation
- Verify trail fades smoothly and doesn't persist between sections
- `npm run build` + `npm run lint` pass

## Out of Scope (future work)

- Lab detail pages (clicking a star to deep-link)
- Adding new labs beyond the current 10
- Drag-to-rotate (was prototyped on labs-orb but removed for this design)
- Per-section custom flyby paths (curved orbits, retrograde, etc.)
