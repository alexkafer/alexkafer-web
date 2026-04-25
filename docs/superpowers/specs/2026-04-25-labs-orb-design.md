# Labs Orb Design

## Problem

The site is currently a hand-tuned single-page narrative: nine sections (Disguise → AB Test), each with its own bespoke 3D layout for the page-spanning constellation. Adding a section requires authoring a new `LayoutFn`, picking an order in `SECTIONS`, and wiring copy. Voice in places leans into self-mythologizing ("PM by title. Systems engineer by instinct.") that the author wants to neutralize. The author wants to pivot the conceptual model: each star in the constellation IS a project / demo / experiment ("lab"), the home page is a slowly rotating orb of those stars, and as the user scrolls one star grows to frame the section it represents.

## Approach

Single spherical layout (Fibonacci sphere) for the constellation, driven from a central labs registry. Each star is a lab; lab index → fixed sphere position. On scroll, the orb rotates so the active lab's star slides to a fixed featured anchor and scales up. At rest the orb idles with slow auto-rotation plus pointer parallax / drag steering. Authoring a new lab = create one TS module under `src/labs/`, add one import to the registry — no per-section layout work, no constellation changes.

## Architecture

### Lab modules

Each lab lives at `src/labs/<slug>.tsx` and exports:

```ts
import type { LabMeta } from "./types";

export const meta: LabMeta = {
  slug: "scale",            // matches DOM id, route-safe
  title: "Scale",           // shown in HUD bar
  blurb: "From two players to two million.",
  version: "v0.3",          // shown in HUD as `cloud · vN.M · TITLE`
  status: "shipped",        // shipped | wip | concept | archived
  tags: ["platform", "infra"],
  order: 30,                // controls page order; hero=0, gaps allowed for inserts
  // optional visual overrides
  starColor: "#7dd3fc",
  starSize: 1.0,            // multiplier
};

export default function Lab() {
  return (/* the section content as it currently lives in components/sections */);
}
```

`LabMeta` is defined in `src/labs/types.ts`:

```ts
export type LabStatus = "shipped" | "wip" | "concept" | "archived";

export interface LabMeta {
  slug: string;
  title: string;
  blurb: string;
  version: string;
  status: LabStatus;
  tags: string[];
  order: number;
  starColor?: string;
  starSize?: number;
}

export interface LabModule {
  meta: LabMeta;
  Component: React.ComponentType;
}
```

### Registry

`src/labs/index.ts` is an explicit re-export (Next 14 doesn't support `import.meta.glob` cleanly):

```ts
import * as hero from "./hero";
import * as disguise from "./disguise";
// ... one import per lab

const ALL: LabModule[] = [hero, disguise, /* ... */].map(m => ({
  meta: m.meta,
  Component: m.default,
}));

export const LABS = [...ALL].sort((a, b) => a.meta.order - b.meta.order);
```

Both the page (renders `<section id={meta.slug}>` per lab) and the constellation (positions stars) consume `LABS`. Adding a lab = create file + add one import line.

### Constellation orb

**Star positions** are deterministic via Fibonacci sphere distribution:

```
phi   = acos(1 - 2*(i+0.5)/N)
theta = pi * (1 + sqrt(5)) * i
pos   = (sin phi cos theta, sin phi sin theta, cos phi) * R
```

Where `i = LABS.findIndex(l => l.meta.slug === lab.meta.slug)` and `N = LABS.length`. R is the orb radius (responsive: `min(viewportW, viewportH) * 0.32 / pixelsPerWorldUnit`). Appending a lab nudges existing positions slightly but never reshuffles identity — every star keeps the same neighbors as the orb grows denser.

**Edges (lines)** are computed once at registry build (top of module):

- For each star, find K=3 nearest neighbors on the sphere.
- Deduplicate (`a < b`) → edge list of unique `(a, b)` pairs.
- Each frame: per-edge opacity uses the existing distance falloff, but the candidate set is fixed instead of all-pairs. This produces a clean sphere-mesh look and stays stable as labs are added.

**Frame loop** (per `useFrame`):

1. Read `getScrollState()` → `activeIndex`, `nextIndex`, `progress`, `blend`.
2. Compute target rotation quaternion: rotation that maps `activeIndex`'s sphere position to the anchor `(-2.2, 0, 1.5)`. Slerp current orb quaternion toward target with `BASE_LERP=0.08`. During morph half (`blend > 0`), slerp toward `nextIndex`'s target by `blend`.
3. Apply orb quaternion to all base positions.
4. Add per-frame additive transforms:
   - **Featured-star lift**: active star scales `1 → 2.0 * meta.starSize`, brighter color (lerp toward white), full opacity. Cross-fades to the next star by `blend`.
   - **Idle wobble**: small Lissajous offsets per star (kept from current scene), damped by `1 - blend * 0.5`.
   - **Drag/cursor delta quaternion**: see below.
5. Update line positions + per-edge opacity (distance falloff).

`src/components/hero/section-layouts.ts` is deleted along with the 10 layout functions and the `LayoutFn` / `SectionEntry` types.

### Hero idle motion

`src/components/hero/use-drag-orbit.ts` returns a quaternion that's *additive* on top of scroll rotation:

- **Auto-rotate**: ~0.05 rad/sec around Y, always on.
- **Pointer parallax**: when no drag, pointer X/Y normalized to `[-0.15, 0.15]` rad tilt (X→Y axis, Y→X axis).
- **Drag**: while pointer is down on the canvas, deltaX→Y rotation, deltaY→X rotation at 0.005 rad/px. On release, drag rotation decays to zero over ~800ms (lerp by 0.04/frame).

The hero (`order=0`) doesn't get a featured star — the orb just shows in full with idle motion. As soon as a non-hero lab becomes active, scroll rotation takes precedence and pulls a star to the anchor; drag delta is still additive but bounded so it can't fully fight the framing.

### Scroll driver

`constellation-background.tsx` already does the heavy lifting. The only change: it iterates `LABS` instead of the hard-coded `SECTIONS` array to find each section's DOM `offsetTop` / `offsetHeight`. `scroll-state.ts` is unchanged in shape; `activeIndex` now means "index into `LABS`."

### HUD

`hud-chrome.tsx` reads `useActiveLabIndex()` (renamed from `useActiveSectionIndex`) and renders `cloud · {LABS[i].meta.version} · {LABS[i].meta.title.toUpperCase()}`. Build SHA stays in the right slot.

## File changes

**Created:**
- `src/labs/types.ts` — `LabMeta`, `LabStatus`, `LabModule`.
- `src/labs/index.ts` — explicit registry, sorted by `meta.order`.
- `src/labs/{hero,disguise,scale,velocity,reliability,efficiency,reach,origin,principles,ab-test}.tsx` — moved from `src/components/sections/` (and `src/components/hero/index.tsx` for hero), each gains a `meta` export.
- `src/components/hero/use-drag-orbit.ts` — pointer state + additive quaternion.
- `src/components/hero/sphere-positions.ts` — pure Fibonacci sphere + KNN edge computation.

**Modified:**
- `src/components/hero/hero-scene.tsx` — orb-only scene, ~120 lines lighter, consumes `LABS` for star count + per-star meta.
- `src/components/hero/constellation-background.tsx` — section iteration sources from `LABS`.
- `src/components/hero/scroll-state.ts` — rename `useActiveSectionIndex` → `useActiveLabIndex`; semantics identical.
- `src/components/hero/hud-chrome.tsx` — read from `LABS` registry.
- `src/app/page.tsx` — render labs via `LABS.map(({ meta, Component }) => <Component key={meta.slug} />)` instead of explicit imports. (Each lab component already wraps itself in `<Section id={...}>` — page.tsx doesn't add another wrapper.)

**Deleted:**
- `src/components/hero/section-layouts.ts`
- `src/components/sections/` (after migration to `src/labs/`)

## Tone rewrite

Voice-only. No project facts change. Pass over each migrated lab and:

- Drop self-mythologizing constructions (e.g. "PM by title. Systems engineer by instinct."). Replace with plain framing of what the section is about.
- Keep section titles (Scale, Velocity, Reliability, Efficiency, etc.) but soften taglines that read as buzzword resume copy.
- HUD vocabulary: keep the `cloud · vN.M · TITLE` shape; replace mythology terms ("IDENTIFIED CONTACT", "THE DISGUISE" in the HUD label) with the lab's actual `title`.
- Footer + StatusPill: quick read-through, drop anything that's posturing.

Out of scope for this spec: rewriting project descriptions, adding new labs, or restructuring section content beyond voice.

## Extensibility examples

Adding a lab "render-pipeline":

1. `touch src/labs/render-pipeline.tsx`.
2. Export `meta = { slug: "render-pipeline", title: "Render Pipeline", order: 95, ... }` and a default component.
3. Add `import * as renderPipeline from "./render-pipeline";` and append to the registry array in `src/labs/index.ts`.

Constellation grows by one star (Fibonacci redistributes evenly), HUD picks it up, page renders the new section in `meta.order` position. No constellation, layout, or page edits.

Reordering labs: change `meta.order`. Stars stay attached to their labs (positions update on next build).

## Testing & verification

- `npx tsc --noEmit` and `npm run lint` after each phase.
- Manual scroll-through verifies: hero shows full orb with idle rotation; drag rotates orb; scroll snaps the matching star to the anchor for each lab; HUD title + version update; no orphaned imports from deleted files.
- `npm run build` succeeds (`rm -rf .next` first if needed — known stale-cache issue documented in prior checkpoints).

## Out of scope

- Dedicated `/labs/[slug]` routes (user picked inline-only).
- MDX or JSON authoring (user picked typed TS modules).
- Adding new labs as part of this work.
- Project-content rewrites beyond voice.
- Search / filter / tag-browse UI (the `tags` field is stored for future use only).
