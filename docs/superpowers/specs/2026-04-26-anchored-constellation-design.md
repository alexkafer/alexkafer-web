# Anchored Constellation Design

**Status:** Approved (autonomous decisions noted inline)
**Supersedes:** `2026-04-26-section-flyby-design.md` (the bottom-up comet flyby is being replaced)

## Vision

The hero is a wobbling cloud of stars (unchanged from today). Each star
represents a project, experience, or interest of mine, and the lines between
them trace how those things connect.

When the user scrolls out of the hero, the cloud **explodes outward** into a
sparse 3-D constellation that fills the full viewport in width, height, and
depth — only 4–5 stars visible at a time. As each section comes into view,
**the section's owned star detaches** from the constellation and locks beside
the section's `// NN · LABEL` line. It scrolls perfectly with the page
content. While locked, that star is connected by faint lines to its 2–3
nearest constellation siblings, which continue to drift quietly in the
background or beyond the viewport edges.

When the user scrolls into the next section, the previous star releases and
drifts back to its parked position; the next section's star lerps from its
parked position to the new label. Same star = same project. The constellation
is one continuous physical object, not a sequence of separate animations.

## Behaviour contract

### Hero (`activeIndex === 0`, `blend < 0.5`-ish)
Identical to today. `LAYOUTS.cloud` + Lissajous wobble + cursor gravity. All
nodes share the cyan node colour.

### Hero → section transition
As `(1 - heroBlend)` rises from 0 → 1:
- Each node's *base position* lerps from its `LAYOUTS.cloud` position toward
  its `LAYOUTS.parked` position (the new sparse 3-D layout — see below).
- Each node's *colour* lerps from the cyan node colour toward its lab colour
  (for designated section stars) or stays cyan (for ambient stars).
- Cursor gravity disengages once `heroBlend < 0.5`.
- Wobble continues unchanged.

`heroBlend = activeIndex === 0 ? 1 - blend : 0`. Same formula as today.

### Section view (`activeIndex >= 1`)
- The active section's owned star releases from its parked target and lerps
  toward a **DOM anchor**: the bounding rect of the section's `// NN` element,
  unprojected from screen space to world coordinates each frame, with a small
  fixed offset to the left so the star sits beside the label rather than on top
  of it.
- All other nodes stay at their parked positions and wobble.
- The active star is rendered slightly larger (~1.4×) and its emissive
  intensity is bumped to give it presence.
- Section lines: a single bundle of 2–3 lines from the active star to its
  2–3 nearest **section star** siblings (computed once at startup from the
  parked layout, deterministic per-section). These siblings may be in or out
  of the viewport — lines extend either way.
- Hero lines (the dense cloud-distance graph) fade out via
  `opacity *= heroBlend`. Section lines fade in via
  `opacity *= 1 - heroBlend` and gate further on `activeIndex >= 1`.

### Section → section transition
The old active star lerps back to its parked position; the new active star
lerps from its parked position to the new DOM anchor. The line bundle swaps:
old set fades, new set rises. We never have two anchored stars
simultaneously — only the section that owns the viewport centre is anchored.

### Reduced motion
- Wobble disabled (already today).
- Lerps run with `BASE_LERP = 1` (snap to target, no animation).
- Anchored star is still positioned via DOM rect (so scrolling still tracks),
  it just doesn't ease into place.

## Architecture

### New / modified files

**`src/components/hero/section-layouts.ts`** — keep `LAYOUTS.cloud`. Add
`LAYOUTS.parked`. Remove the per-section morph tables (`SECTIONS`, all the
other layouts) since they're no longer used. The shared `personality(i, total)`
keyed RNG stays.

`LAYOUTS.parked` produces a sparse 3-D arrangement:
- X spread ~1.6× the cloud spread (uses full viewport horizontally)
- Y spread ~1.4× the cloud spread (uses full viewport vertically)
- Z spread ~3–4× the cloud spread (real 3-D depth)
- Stars distributed by golden-angle on a flattened ellipsoid for even,
  non-grid-looking placement.

**`src/components/hero/section-stars.ts` (new)** — given `nodeCount`, returns
an assignment `{ sectionIndex → starIndex }` for sectionIndex 1..9. Picks 9
node indices that are well-spread in parked-space (by sampling parked
positions and greedily choosing the most-distant). Stable per `(nodeCount)`.
Also exposes `computeNeighborPairs(assignment, parkedPositions)` returning
a `Map<sectionIndex, [starIndex, starIndex, starIndex]>` of the 2–3 nearest
section-star siblings (excluding self). The ambient nodes (the
`nodeCount - 9` non-section nodes) keep their cyan colour.

**`src/components/hero/dom-anchor.ts` (new)** — `getAnchorWorldPos(slug,
camera, viewportSize, offsetPx)` reads `document.getElementById(`${slug}-marker`)`,
computes the centre of its bounding rect, applies the left-offset (~28 px),
and unprojects to world coords at z=0. Returns `null` if the element is
missing or the section is not in the viewport (in which case the caller
falls back to the parked target).

**`src/components/hero/hero-scene.tsx`** —
- `Scene`: compute parked positions + section-star assignment + neighbour
  pairs as memoised data based on `nodeCount` and viewport spread.
- `ConstellationNodes` `useFrame`: per-node target = lerp(cloud, parked,
  `1 - heroBlend`); if node is the active-section star and we're in section
  view (`activeIndex >= 1`), override target with the DOM-anchor world pos
  (when available). Wobble unchanged. Colour blends cloud→lab. Active star
  size bumps.
- `ConstellationLinks`: keep the existing distance-based hero pairs (fade
  by `heroBlend`). Add a separate `<SectionLinks>` group that draws the
  active section's 2–3 lines (fade by `1 - heroBlend`).
- Drop `FlybyLayer`, `FlybyStarSlot`, the `FlybyStar` import. Mark
  `flyby-star.tsx` for deletion.

**Each of 9 section files** — add `id={`${slug}-marker`}` to the existing
`// NN · LABEL` element. No new DOM, no layout shift. Hero is exempt
(no anchor needed).

**Files to delete:**
- `src/components/hero/flyby-star.tsx`
- `src/components/hero/lab-color.ts` is still used (re-exported by
  section-stars), keep.

### Data flow

```
scroll  ─►  scroll-state {activeIndex, blend}
                   │
                   ▼
         ConstellationNodes useFrame ──► per-node base lerp
                   │                       (cloud ↔ parked ↔ DOM-anchor)
                   ▼
         ConstellationLinks useFrame ──► fade hero pairs (× heroBlend)
                   │
                   ▼
              SectionLinks useFrame ──► fade active-section bundle
                                         (× 1-heroBlend, × activeIndex>=1)
```

DOM anchor lookups happen inside `useFrame`. They are O(1) per frame and
already on the main thread (R3F runs there too), so cost is negligible.

## Decisions made autonomously

The user requested autonomous execution. These choices were not explicitly
specified in the prompt; I'm noting them so they're easy to revisit.

1. **Star ↔ section binding is by `nodeCount`-stable assignment**, not by
   position-in-LABS. The 9 section stars are picked to be well-spread in
   parked space so the line bundles look balanced.
2. **Ambient (non-section) stars** keep their cyan colour and slightly smaller
   size (~0.85×). They fill out the constellation visually.
3. **DOM anchor offset** is 28 px left of the marker's left edge, vertically
   centred on the marker. Justification: the `// NN` text is small mono;
   28 px gives breathing room without colliding with the section's gutter.
4. **Active-star scale bump** is 1.4×, emissive intensity 1.0 (vs base 0.6).
   Visible, not garish.
5. **Neighbour count** is fixed at 3 nearest section stars per section. The
   user said "2-3"; 3 reads as more interconnected and avoids the fragile
   look of 2-line bundles.
6. **Section-star palette** = each lab's `meta.color` (already in manifest).
   Hero state forces all stars to NODE_COLOR via the cloud→lab colour blend.
7. **Per-section line colour** = active star's lab colour at full saturation;
   neighbour-end of each line is at 40% alpha (vertex-coloured fade).

## Out of scope

- Building a clickable star → opens a project detail page. Plumbed by the
  existing `LabMeta` shape but not wired here. Future work.
- A separate "labs index" route. Future work.
- Animating the line endpoints (e.g. orbital easing). The current straight-line
  rendering is good enough.
- Mobile-specific layout tuning beyond what `nodeCount` already does.
- Cleanup of the now-unused `LAYOUTS.frameRight/corners/sweep/...` and the
  flyby code. Removed in this change since they'd otherwise become dead code.
