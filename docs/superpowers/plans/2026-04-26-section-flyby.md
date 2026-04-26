# Section-Flyby Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore main's drifting-cloud hero constellation, then replace per-section layout morphing with per-section flyby stars (one lab star travels through the viewport beside each section's content) using lab metadata cherry-picked from `feature/labs-orb`.

**Architecture:** Hero (`activeIndex === 0`) renders main's existing constellation cloud unchanged. Section view (`activeIndex > 0`) fades the constellation to 0 and renders one or two `FlybyStar` components — each is a single mesh + a 30-vertex `THREE.Line` comet trail whose y position is driven by per-section scroll progress. Sides alternate by section parity, color comes from the lab manifest, and the existing scroll-state module gains a `sectionProgress` field.

**Tech Stack:** Next.js 14 app router, React 18 client components, `@react-three/fiber`, `@react-three/drei`'s `Line`, `three`, Tailwind. Worktree dev runs on port 3003; current branch dev (main) on 3000–3002.

---

## File Structure

**Cherry-picked from `feature/labs-orb`** (new files in main):

- `src/labs/types.ts` — `LabMeta` type
- `src/labs/manifest.ts` — per-lab `LabMeta` consts + sorted `LABS` array
- `src/labs/index.ts` — re-export barrel

**Modified in main:**

- `src/components/hero/scroll-state.ts` — add `sectionProgress` field
- `src/components/hero/constellation-background.tsx` — write `sectionProgress` from the scroll driver; nothing else changes
- `src/components/hero/section-layouts.ts` — keep `cloud` layout (used by hero), keep `SECTIONS` array (drives section→lab mapping); the other layouts become unused but stay so we don't churn the file
- `src/components/hero/hero-scene.tsx` — fade `ConstellationNodes` + `ConstellationLinks` opacity by `1 - heroBlend`; stop morphing layouts in section view; mount `FlybyStar` for active + next section

**New files in main:**

- `src/components/hero/flyby-star.tsx` — `FlybyStar` component (mesh + comet trail)
- `src/components/hero/lab-color.ts` — small helper that maps `LabMeta` to a `THREE.Color` with a sensible cyan fallback (kept tiny so it can be imported by both `flyby-star.tsx` and any future status pill)

---

## Pre-flight

- [ ] **Step 0.1: Create branch off main**

```bash
cd /Users/alexkafer/Development/alexkafer
git checkout main
git pull --ff-only origin main 2>/dev/null || true
git checkout -b feature/section-flyby
```

- [ ] **Step 0.2: Confirm the spec is committed**

```bash
ls docs/superpowers/specs/2026-04-26-section-flyby-design.md
```

Expected: file exists.

- [ ] **Step 0.3: Verify a dev server can start (don't leave it running)**

```bash
npm install --silent 2>&1 | tail -5
npm run dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:3000/ -o /dev/null && echo "dev OK"
kill $DEV_PID 2>/dev/null
```

Expected: `dev OK`.

---

## Task 1: Cherry-pick the lab manifest

**Files:**
- Create: `src/labs/types.ts`
- Create: `src/labs/manifest.ts`
- Create: `src/labs/index.ts`

- [ ] **Step 1.1: Create `src/labs/types.ts`**

```ts
// src/labs/types.ts
//
// Plain-data metadata describing a lab (a section / project / experiment).
// Kept free of "use client" so server components can sort/iterate it.

export type LabStatus = "shipped" | "in-progress" | "draft";

export type LabMeta = {
  slug: string;
  title: string;
  blurb: string;
  version: string;
  status: LabStatus;
  tags: string[];
  /** Sort order — lower runs earlier in the page. */
  order: number;
  /**
   * Hex color used to tint the lab's flyby star + trail. Falls back to cyan
   * when omitted.
   */
  color?: string;
  /**
   * Override the auto (parity-based) flyby side. Defaults to alternating.
   */
  flybySide?: "left" | "right";
};
```

- [ ] **Step 1.2: Create `src/labs/manifest.ts`**

The slugs MUST match the existing section IDs already used in `app/page.tsx` and `section-layouts.ts` so the scroll driver keeps locating them by `document.getElementById`.

```ts
// src/labs/manifest.ts

import type { LabMeta } from "./types";

export const heroMeta: LabMeta = {
  slug: "hero",
  title: "Identified Contact",
  blurb: "Senior PM, Xbox Platform.",
  version: "v0.0",
  status: "shipped",
  tags: ["intro"],
  order: 0,
};

export const disguiseMeta: LabMeta = {
  slug: "disguise",
  title: "The Disguise",
  blurb: "Product by title, systems by practice.",
  version: "v0.2",
  status: "shipped",
  tags: ["intro"],
  order: 20,
  color: "#a78bfa",
};

export const scaleMeta: LabMeta = {
  slug: "scale",
  title: "Scale",
  blurb: "From two players to two million.",
  version: "v0.3",
  status: "shipped",
  tags: ["platform"],
  order: 30,
  color: "#7dd3fc",
};

export const velocityMeta: LabMeta = {
  slug: "velocity",
  title: "Velocity",
  blurb: "Ship and learn fast.",
  version: "v0.4",
  status: "shipped",
  tags: ["platform"],
  order: 40,
  color: "#34d399",
};

export const reliabilityMeta: LabMeta = {
  slug: "reliability",
  title: "Reliability",
  blurb: "Quiet pagers, awake users.",
  version: "v0.5",
  status: "shipped",
  tags: ["platform"],
  order: 50,
  color: "#fbbf24",
};

export const efficiencyMeta: LabMeta = {
  slug: "efficiency",
  title: "Efficiency",
  blurb: "Do more with the same fleet.",
  version: "v0.6",
  status: "shipped",
  tags: ["platform"],
  order: 60,
  color: "#f472b6",
};

export const reachMeta: LabMeta = {
  slug: "reach",
  title: "Reach",
  blurb: "Rolling out without breaking it.",
  version: "v0.7",
  status: "shipped",
  tags: ["platform"],
  order: 70,
  color: "#60a5fa",
};

export const originMeta: LabMeta = {
  slug: "origin",
  title: "Origin",
  blurb: "Where the platform thinking started.",
  version: "v0.8",
  status: "shipped",
  tags: ["story"],
  order: 80,
  color: "#fb923c",
};

export const principlesMeta: LabMeta = {
  slug: "principles",
  title: "Principles",
  blurb: "How I work, distilled.",
  version: "v0.9",
  status: "shipped",
  tags: ["story"],
  order: 90,
  color: "#c4b5fd",
};

export const labMeta: LabMeta = {
  slug: "lab",
  title: "Experiment",
  blurb: "Live A/B in the browser.",
  version: "v1.0",
  status: "shipped",
  tags: ["lab"],
  order: 100,
  color: "#22d3ee",
};

// Order MUST match the rendered <section id="..."> order in app/page.tsx so
// the scroll driver's section index lines up with this array.
export const LABS: LabMeta[] = [
  heroMeta,
  disguiseMeta,
  scaleMeta,
  velocityMeta,
  reliabilityMeta,
  efficiencyMeta,
  reachMeta,
  originMeta,
  principlesMeta,
  labMeta,
];
```

- [ ] **Step 1.3: Create `src/labs/index.ts`**

```ts
export type { LabMeta, LabStatus } from "./types";
export { LABS } from "./manifest";
```

- [ ] **Step 1.4: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 1.5: Commit**

```bash
git add src/labs/
git commit -m "feat(labs): introduce per-lab metadata manifest

Cherry-picked from feature/labs-orb. Plain-data LabMeta consts plus a
sorted LABS array. Slugs match existing section IDs so the scroll driver
in constellation-background.tsx can keep locating sections by getElementById.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Extend scroll state with `sectionProgress`

**Files:**
- Modify: `src/components/hero/scroll-state.ts`
- Modify: `src/components/hero/constellation-background.tsx`

- [ ] **Step 2.1: Add `sectionProgress` to the `ScrollState` type and initial state**

In `src/components/hero/scroll-state.ts`, replace the `ScrollState` type and `state` constant:

```ts
export type ScrollState = {
  activeIndex: number;
  nextIndex: number;
  /** 0..1 within the section under the viewport center (legacy). */
  progress: number;
  /** 0..1 — interpolation toward nextIndex's layout (legacy). */
  blend: number;
  /**
   * 0..1 across the active section's *full* scroll range:
   * 0 when the section's top is at the viewport bottom,
   * 1 when the section's bottom is at the viewport top.
   * Used by FlybyStar to drive its enter→exit animation.
   */
  sectionProgress: number;
};

const state: { current: ScrollState } = {
  current: {
    activeIndex: 0,
    nextIndex: 0,
    progress: 0,
    blend: 0,
    sectionProgress: 0,
  },
};
```

Update the equality short-circuit in `setScrollState` to compare `sectionProgress` too:

```ts
export function setScrollState(next: Partial<ScrollState>) {
  const merged = { ...state.current, ...next };
  const prev = state.current;
  if (
    merged.activeIndex === prev.activeIndex &&
    merged.nextIndex === prev.nextIndex &&
    Math.abs(merged.progress - prev.progress) < 0.001 &&
    Math.abs(merged.blend - prev.blend) < 0.001 &&
    Math.abs(merged.sectionProgress - prev.sectionProgress) < 0.001
  ) {
    return;
  }
  state.current = merged;
  listeners.forEach((l) => l(state.current));
}
```

- [ ] **Step 2.2: Compute `sectionProgress` in the scroll driver**

In `src/components/hero/constellation-background.tsx`, replace the `computeAndSet` body so it also computes `sectionProgress`:

```tsx
    const computeAndSet = () => {
      ticking = false;
      const elements = SECTIONS.map((s) => document.getElementById(s.id));
      const vh = window.innerHeight;
      const center = window.scrollY + vh / 2;
      const viewportTop = window.scrollY;
      const viewportBottom = window.scrollY + vh;

      let activeIndex = 0;
      let progress = 0;

      // Walk sections; locate the one containing the viewport center.
      let placed = false;
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (center >= top && center < top + height) {
          activeIndex = i;
          progress = (center - top) / Math.max(height, 1);
          placed = true;
          break;
        }
        if (center < top) {
          activeIndex = Math.max(0, i - 1);
          const cur = elements[activeIndex];
          if (cur) {
            progress = Math.min(
              1,
              Math.max(0, (center - cur.offsetTop) / Math.max(cur.offsetHeight, 1)),
            );
          }
          placed = true;
          break;
        }
      }
      if (!placed) {
        activeIndex = elements.length - 1;
        progress = 1;
      }

      progress = Math.min(1, Math.max(0, progress));
      const nextIndex = Math.min(SECTIONS.length - 1, activeIndex + 1);
      const blend = progress < 0.5 ? 0 : (progress - 0.5) * 2;

      // sectionProgress: 0 when section top crosses viewport bottom,
      // 1 when section bottom crosses viewport top. Total travel = section
      // height + viewport height.
      const activeEl = elements[activeIndex];
      let sectionProgress = 0;
      if (activeEl) {
        const top = activeEl.offsetTop;
        const height = activeEl.offsetHeight;
        const travel = height + vh;
        const traveled = viewportBottom - top;
        sectionProgress = Math.min(1, Math.max(0, traveled / Math.max(travel, 1)));
      }

      setScrollState({ activeIndex, nextIndex, progress, blend, sectionProgress });
    };
```

(Just replace the entire `computeAndSet` function body — same arrow signature, same scope.)

- [ ] **Step 2.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 2.4: Commit**

```bash
git add src/components/hero/scroll-state.ts src/components/hero/constellation-background.tsx
git commit -m "feat(hero): track per-section scroll progress

Adds sectionProgress (0..1 across the section's full enter-exit travel) to
the shared scroll state. The flyby star reads this every frame to drive its
y position. Existing 'progress' field (0..1 within the active section by
viewport-center) and 'blend' are unchanged.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Lab color helper

**Files:**
- Create: `src/components/hero/lab-color.ts`

- [ ] **Step 3.1: Create the helper**

```ts
// src/components/hero/lab-color.ts
import * as THREE from "three";
import type { LabMeta } from "@/labs/types";

const FALLBACK = new THREE.Color("#7dd3fc");

export function labColor(meta: LabMeta | undefined): THREE.Color {
  if (!meta?.color) return FALLBACK.clone();
  try {
    return new THREE.Color(meta.color);
  } catch {
    return FALLBACK.clone();
  }
}
```

- [ ] **Step 3.2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/components/hero/lab-color.ts
git commit -m "feat(hero): labColor helper

Maps a LabMeta to a THREE.Color with a cyan fallback. Used by FlybyStar to
tint the star + comet trail per lab.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: `FlybyStar` component

**Files:**
- Create: `src/components/hero/flyby-star.tsx`

- [ ] **Step 4.1: Create the component**

```tsx
// src/components/hero/flyby-star.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabMeta } from "@/labs/types";
import { labColor } from "./lab-color";

const TRAIL_LENGTH = 30;

type Props = {
  /** Lab metadata for color, side override, etc. */
  meta: LabMeta;
  /** 0-based section index used for parity-based side selection. */
  sectionIndex: number;
  /** 0..1 within the active section's full travel. */
  progress: number;
  /** 0..1 master fade — gate visibility while constellation cross-fades. */
  opacity: number;
};

const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

/**
 * One section's lab star. Enters from off-screen below, sweeps up past the
 * section header, exits off-screen above. Side alternates by section parity
 * unless the lab overrides via `meta.flybySide`.
 *
 * Mounted twice at most at any one time (active + next during transitions).
 */
export function FlybyStar({ meta, sectionIndex, progress, opacity }: Props) {
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;

  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments | null>(null);

  // Trail buffers — preallocated, mutated in useFrame.
  const trail = useMemo(() => {
    // (TRAIL_LENGTH - 1) segments * 2 endpoints * 3 components
    const segments = TRAIL_LENGTH - 1;
    const positions = new Float32Array(segments * 2 * 3);
    const colors = new Float32Array(segments * 2 * 3);
    const history: THREE.Vector3[] = Array.from(
      { length: TRAIL_LENGTH },
      () => new THREE.Vector3(),
    );
    return { positions, colors, history, segments };
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(trail.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(trail.colors, 3));
    return g;
  }, [trail]);

  // Reset history on mount / when key props change so the trail doesn't snap
  // from the previous lab's tail.
  useEffect(() => {
    trail.history.forEach((v) => v.set(0, -halfH * 2, 0));
  }, [meta.slug, halfH, trail]);

  const baseColor = useMemo(() => labColor(meta), [meta]);

  useFrame(() => {
    const mesh = meshRef.current;
    const line = lineRef.current;
    if (!mesh) return;

    // Side selection.
    const explicit = meta.flybySide;
    const side =
      explicit === "left" ? -1 : explicit === "right" ? 1 : sectionIndex % 2 === 1 ? -1 : 1;

    // y(t): off-screen below to off-screen above with mild ease.
    const t = ease(Math.min(1, Math.max(0, progress)));
    const y = -halfH * 1.15 + t * halfH * 2.3;

    // x(t): start out near the edge, drift inward as we rise so the star
    // sweeps past the section header.
    const x = side * halfW * (0.65 - 0.15 * t);

    // z(t): small forward bulge at center for depth.
    const z = 0.3 * Math.sin(progress * Math.PI);

    mesh.position.set(x, y, z);

    // Scale peaks at center, smaller at entry/exit.
    const scale = 0.6 + 0.6 * Math.sin(progress * Math.PI);
    const baseSize = Math.max(0.05, Math.min(halfW, halfH) * 0.04);
    mesh.scale.setScalar(scale * baseSize * 5);

    // Material color + opacity.
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(baseColor);
    mat.emissive.copy(baseColor);
    mat.emissiveIntensity = 0.9;
    mat.opacity = opacity;
    mat.transparent = true;

    // Update trail history (push head, drop tail).
    for (let i = trail.history.length - 1; i > 0; i--) {
      trail.history[i].copy(trail.history[i - 1]);
    }
    trail.history[0].set(x, y, z);

    // Rebuild line segments + per-vertex colors.
    if (line) {
      const { positions, colors, segments, history } = trail;
      for (let i = 0; i < segments; i++) {
        const a = history[i];
        const b = history[i + 1];
        positions[i * 6 + 0] = a.x;
        positions[i * 6 + 1] = a.y;
        positions[i * 6 + 2] = a.z;
        positions[i * 6 + 3] = b.x;
        positions[i * 6 + 4] = b.y;
        positions[i * 6 + 5] = b.z;

        // Head bright, tail transparent. Multiplied into vertex color so the
        // additive line material falls off naturally.
        const fadeA = (1 - i / segments) * opacity;
        const fadeB = (1 - (i + 1) / segments) * opacity;
        colors[i * 6 + 0] = baseColor.r * fadeA;
        colors[i * 6 + 1] = baseColor.g * fadeA;
        colors[i * 6 + 2] = baseColor.b * fadeA;
        colors[i * 6 + 3] = baseColor.r * fadeB;
        colors[i * 6 + 4] = baseColor.g * fadeB;
        colors[i * 6 + 5] = baseColor.b * fadeB;
      }
      const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
      const colAttr = geom.getAttribute("color") as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.9}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={opacity}
        />
      </mesh>
      <lineSegments
        ref={lineRef}
        geometry={geom}
      >
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1.5}
        />
      </lineSegments>
    </group>
  );
}
```

- [ ] **Step 4.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/hero/flyby-star.tsx
git commit -m "feat(hero): FlybyStar component (mesh + comet trail)

Single lab-colored star that travels from off-screen bottom to off-screen
top, with a 30-vertex additive line trail whose vertex colors fade head→tail.
Side picked by section-index parity unless the lab overrides via
meta.flybySide. Pre-allocates buffers and mutates them in useFrame to avoid
per-frame allocations.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Wire FlybyStars into the Scene + fade the constellation

**Files:**
- Modify: `src/components/hero/hero-scene.tsx`

- [ ] **Step 5.1: Import the new pieces**

At the top of `src/components/hero/hero-scene.tsx`, after the existing imports, add:

```tsx
import { FlybyStar } from "./flyby-star";
import { LABS } from "@/labs";
```

- [ ] **Step 5.2: Stop morphing layouts in section view + drive constellation opacity**

Replace the body of `useFrame` inside `ConstellationNodes` (currently lines ~131–193). The new behavior: the layout target is always `cloud` (hero layout); only the per-node *opacity* responds to scroll, fading from 1 in hero view to 0 in any section view. Existing wobble + cursor gravity continue to apply. Replace ENTIRELY with:

```tsx
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sc = getScrollState().current;

    // Hero blend: 1 in pure hero, falls to 0 as we leave hero, stays 0
    // throughout section view. Used to fade constellation in/out.
    const heroBlend =
      sc.activeIndex === 0 ? 1 - sc.blend : 0;

    if (cursor.current.active) {
      projected.current.set(cursor.current.x, cursor.current.y, 0.5);
      projected.current.unproject(camera);
      const dir = projected.current.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      projected.current.copy(camera.position).add(dir.multiplyScalar(distance));
    }

    const layout = LAYOUTS.cloud;

    nodes.forEach((node, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;

      // Single hero layout — no per-section morph.
      const arr = layout(i, nodes.length, spread);
      node.a.set(arr[0], arr[1], arr[2]);

      if (reduced) {
        node.base.copy(node.a);
      } else {
        node.base.lerp(node.a, BASE_LERP);
      }

      const wobbleScale = reduced ? 0 : 1;
      const { ampX, ampY, ampZ, phaseX, phaseY, phaseZ, speed } = node.liss;
      const ox = Math.sin(t * speed + phaseX) * ampX * wobbleScale;
      const oy = Math.sin(t * speed * 1.3 + phaseY) * ampY * wobbleScale;
      const oz = Math.sin(t * speed * 0.9 + phaseZ) * ampZ * wobbleScale;
      const baseX = node.base.x + ox;
      const baseY = node.base.y + oy;
      const baseZ = node.base.z + oz;

      const target = tmp.current.set(0, 0, 0);
      if (cursor.current.active && !reduced && heroBlend > 0.5) {
        const dx = projected.current.x - baseX;
        const dy = projected.current.y - baseY;
        const dz = projected.current.z - baseZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < cursorRadius) {
          const falloff = 1 - dist / cursorRadius;
          target.set(dx, dy, dz).multiplyScalar(falloff * cursorStrength);
        }
      }
      const off = offsets.current[i];
      off.lerp(target, DAMPING);

      mesh.position.set(baseX + off.x, baseY + off.y, baseZ + off.z);
      positionsRef.current[i].copy(mesh.position);

      // Fade per-node opacity by heroBlend so the cloud disappears in
      // section view, leaving the FlybyStar alone on stage.
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = heroBlend;
    });
  });
```

- [ ] **Step 5.3: Fade the constellation links too**

Inside `ConstellationLinks`, replace the `useFrame` body (currently lines ~259–287) so link opacity is multiplied by `heroBlend`:

```tsx
  useFrame(() => {
    const sc = getScrollState().current;
    const heroBlend =
      sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const cutoff = linkDistance;

    pairs.forEach(([i, j], k) => {
      const obj = lineRefs.current[k] as unknown as {
        geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
        material?: { opacity?: number; transparent?: boolean };
      } | null;
      if (!obj?.geometry?.setPositions) return;
      const a = positionsRef.current[i];
      const b = positionsRef.current[j];
      if (!a || !b) return;
      const buf = segBuffer.current;
      buf[0] = a.x; buf[1] = a.y; buf[2] = a.z;
      buf[3] = b.x; buf[4] = b.y; buf[5] = b.z;
      obj.geometry.setPositions(buf);

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (obj.material) {
        const visible = Math.max(0, 1 - dist / cutoff);
        obj.material.transparent = true;
        obj.material.opacity = 0.55 * visible * heroBlend;
      }
    });
  });
```

- [ ] **Step 5.4: Mount active + next FlybyStar in `Scene`**

Add a new component above `Scene`:

```tsx
function FlybyLayer() {
  // Re-render only when activeIndex changes — every-frame work happens
  // inside FlybyStar's useFrame, not here.
  const [tick, setTick] = useState(0);
  const stateRef = useRef({ activeIndex: 0, nextIndex: 0 });
  useEffect(() => {
    return subscribeScrollState((s) => {
      const prev = stateRef.current;
      if (s.activeIndex !== prev.activeIndex || s.nextIndex !== prev.nextIndex) {
        stateRef.current = { activeIndex: s.activeIndex, nextIndex: s.nextIndex };
        setTick((n) => n + 1);
      }
    });
  }, []);

  // Each FlybyStar reads scroll state in its own useFrame so we don't have to
  // re-render this layer per scroll frame.
  return (
    <FlybyHost key={tick} active={stateRef.current.activeIndex} next={stateRef.current.nextIndex} />
  );
}

function FlybyHost({ active, next }: { active: number; next: number }) {
  // active === 0 means hero — no flybys.
  // We mount at most two stars: the active one (when not hero) and the next
  // one whenever it differs and isn't hero.
  const stars: Array<{ index: number; key: string }> = [];
  if (active >= 1) stars.push({ index: active, key: `active-${active}` });
  if (next !== active && next >= 1) stars.push({ index: next, key: `next-${next}` });

  return (
    <>
      {stars.map(({ index, key }) => (
        <FlybyStarSlot key={key} sectionIndex={index} role={index === active ? "active" : "next"} />
      ))}
    </>
  );
}

function FlybyStarSlot({
  sectionIndex,
  role,
}: {
  sectionIndex: number;
  role: "active" | "next";
}) {
  // Pull live scroll state every frame, compute the per-star progress and
  // opacity, hand to FlybyStar via props that update via parent re-render.
  const [snap, setSnap] = useState(() => getScrollState().current);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setSnap({ ...getScrollState().current });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const meta = LABS[sectionIndex];
  if (!meta) return null;

  // Active star runs through its sectionProgress directly.
  // Next star starts at progress 0 and only becomes visible during the
  // blend window so the two stars overlap briefly.
  let progress: number;
  let opacity: number;
  if (role === "active") {
    progress = snap.sectionProgress;
    // Fade out as we leave the section (last 10% of progress).
    const exitFade = 1 - Math.max(0, (snap.sectionProgress - 0.9) / 0.1);
    opacity = exitFade;
  } else {
    // role === "next": start advancing only once active is past 0.85.
    const prep = Math.max(0, (snap.sectionProgress - 0.85) / 0.15);
    progress = prep * 0.15; // start near the bottom
    opacity = prep;
  }

  return (
    <FlybyStar
      meta={meta}
      sectionIndex={sectionIndex}
      progress={progress}
      opacity={opacity}
    />
  );
}
```

Add the missing imports at the top of the file:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
```

(replacing the current `import { useEffect, useMemo, useRef } from "react";`), and add this import alongside the other scroll-state import:

```tsx
import { getScrollState, subscribeScrollState } from "./scroll-state";
```

Render `<FlybyLayer />` inside `Scene`'s JSX, after `<ConstellationLinks ... />`:

```tsx
      <ConstellationLinks
        nodes={nodes}
        positionsRef={positionsRef}
        linkDistance={linkDistance}
      />
      <FlybyLayer />
    </>
```

- [ ] **Step 5.5: Type-check**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5.6: Manual smoke test**

```bash
rm -rf .next
npm run dev &
DEV_PID=$!
sleep 10
curl -sf http://localhost:3000/ -o /dev/null && echo "up"
```

Expected: `up`. Then in a browser at `http://localhost:3000/`:
- Hero: full constellation visible (looks like main).
- Scroll to any section: constellation faded to ~0; a single colored star drifts up the side of the screen with a comet tail.
- Continue scrolling: star exits top, next section's star enters from bottom on the other side.

Stop the dev server: `kill $DEV_PID`.

- [ ] **Step 5.7: Commit**

```bash
git add src/components/hero/hero-scene.tsx
git commit -m "feat(hero): fade constellation in section view + mount FlybyStars

Constellation nodes + links now fade to 0 opacity when activeIndex > 0,
leaving only the section's flyby star visible. A FlybyLayer mounts at most
two FlybyStars (active + next during transitions) and feeds them the live
sectionProgress.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Verification

- [ ] **Step 6.1: Lint**

```bash
npm run lint 2>&1 | tail -10
```

Expected: no warnings/errors from any new file (`src/labs/*`, `src/components/hero/flyby-star.tsx`, `src/components/hero/lab-color.ts`, modified `hero-scene.tsx`, modified `scroll-state.ts`, modified `constellation-background.tsx`).

- [ ] **Step 6.2: Build**

```bash
rm -rf .next
npm run build 2>&1 | tail -20
```

Expected: build completes; static page `/` listed in route output. (Build occasionally flakes with `Cannot find module for page: /api/ab/*` or `_document` — if so, `rm -rf .next && npm run build` again, up to 3 retries.)

- [ ] **Step 6.3: Playwright visual sweep**

```bash
npm run dev &
DEV_PID=$!
sleep 10

npx --no-install playwright-cli open http://localhost:3000/ 2>&1 | tail -2
sleep 2
npx --no-install playwright-cli screenshot --filename=/tmp/flyby-hero.png 2>&1 | tail -2

# Scroll to each section and screenshot.
for i in 1 2 3 4 5 6 7 8 9; do
  npx --no-install playwright-cli eval "() => { window.scrollTo(0, innerHeight * (${i} + 0.5)); return 'ok'; }" 2>&1 | tail -1
  sleep 1
  npx --no-install playwright-cli screenshot --filename=/tmp/flyby-section-${i}.png 2>&1 | tail -1
done

npx --no-install playwright-cli close
kill $DEV_PID
```

Expected: 10 screenshots in `/tmp/`. Open `/tmp/flyby-hero.png` and confirm full constellation. Open `/tmp/flyby-section-1.png` … `/tmp/flyby-section-9.png` and confirm each shows ONE colored star (no constellation cloud), alternating sides, with a thin trail.

- [ ] **Step 6.4: Reduced-motion sanity check**

Open Chromium with `prefers-reduced-motion: reduce` and confirm constellation still renders without wobble; flyby stars still travel (their motion is the *content*, not decoration). The lab colors and trail should still be present.

```bash
npx --no-install playwright-cli open --browser=chrome http://localhost:3000/ 2>&1 | tail -2
npx --no-install playwright-cli eval "() => { document.documentElement.style.setProperty('forced-color-adjust', 'auto'); return 'ok'; }"
```

(Reduced-motion is media-query gated in `Scene`; verifying via DevTools emulation in the dashboard is sufficient — note in commit.)

- [ ] **Step 6.5: Final commit + push**

```bash
git status --short
# Expect: clean (nothing uncommitted) — all changes from Tasks 1-5 already
# committed individually.
git --no-pager log feature/section-flyby --oneline main..HEAD
git push -u origin feature/section-flyby
```

---

## Self-Review Notes

- **Spec coverage:** hero (Task 5), section flyby (Task 4 + 5), comet trail (Task 4), alternating sides (Task 4), continuous flow / cross-fade (Task 5.4 `FlybyHost`), lab manifest (Task 1), `sectionProgress` (Task 2), thin-glowing-line trail style (Task 4 — `lineSegments` + `vertexColors` + `AdditiveBlending`).
- **Files in spec match files in plan:** ✅ (no `use-drag-orbit.ts`, `label-state.ts`, or `sphere-positions.ts` brought over; all confirmed discarded).
- **Type consistency:** `LabMeta` defined in Task 1.1, used in Tasks 3.1 and 4.1 with the same property names (`color`, `flybySide`, `slug`). `ScrollState.sectionProgress` defined in Task 2.1, consumed in Tasks 5.4 (`FlybyStarSlot`).
- **Out-of-scope guard:** `section-layouts.ts` keeps its current SECTIONS array (drives section-id mapping) — we do NOT delete unused layouts in this plan to avoid scope creep. Cleanup can happen in a follow-up.
- **Known build flake:** documented in Step 6.2 with retry guidance.
