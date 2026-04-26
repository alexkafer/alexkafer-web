# Anchored Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the bottom-up flyby with a single coherent constellation that morphs from the hero cloud into a sparse 3-D field, where each section's owned star DOM-anchors beside its `// NN · LABEL` line and connects to its 2-3 nearest siblings.

**Architecture:** Single R3F scene, single set of N nodes. `LAYOUTS.cloud` (today) ↔ `LAYOUTS.parked` (new) blended by `1 - heroBlend`. 9 of N nodes are designated section stars (color-coded). Each frame, the active section's star overrides its parked target with a DOM-anchor world position read from `getElementById(`${slug}-marker`).getBoundingClientRect()`. Section-line bundles are pre-computed per section as the 2–3 nearest section-star neighbors in parked space.

**Tech Stack:** Next.js 14 + React 18 + react-three-fiber + three.js + drei + framer-motion + GSAP (existing).

**Branch:** Continue on `feature/section-flyby` (will rename or just merge as-is — branch name is informational).

---

## File map

**Create:**
- `src/components/hero/parked-layout.ts` — `parked` LayoutFn (sparse 3-D ellipsoid via golden-angle).
- `src/components/hero/section-stars.ts` — `assignSectionStars(nodeCount, spread)` and `computeNeighborPairs(assignment, parked)` (deterministic, well-spread).
- `src/components/hero/dom-anchor.ts` — `getAnchorWorldPos(slug, camera, halfH, halfW)` returns `THREE.Vector3 | null`.

**Modify:**
- `src/components/hero/section-layouts.ts` — keep `cloud`, drop the morph layouts and `SECTIONS` table (no longer needed; `constellation-background.tsx`'s `ScrollDriver` will use `LABS` instead).
- `src/components/hero/constellation-background.tsx` — `ScrollDriver` switches from `SECTIONS` to `LABS`.
- `src/components/hero/hero-scene.tsx` — see Task 5 for the surgical changes.
- `src/components/sections/{disguise,scale,velocity,reliability,efficiency,reach,origin,principles,ab-test}.tsx` — add `id="${slug}-marker"` to each `// NN · LABEL` element.

**Delete:**
- `src/components/hero/flyby-star.tsx`
- `src/components/hero/lab-color.ts` is RETAINED (used by section-stars).

---

## Task 0: Pre-flight

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /Users/alexkafer/Development/alexkafer
git status
git branch --show-current
```

Expected: branch `feature/section-flyby`, working tree clean.

- [ ] **Step 2: Verify dev server is reusable**

```bash
curl -skI https://alexkafer.localhost:1355/ | head -1
```

Expected: `HTTP/2 200`. (If not running, start per `.github/copilot-instructions.md`.)

---

## Task 1: Add markers to section labels

The 9 section files each render their `// NN · LABEL` text as a `<p>` or `<div>`. Add `id="${slug}-marker"` to that element so the 3-D scene can DOM-anchor to it.

**Files:**
- Modify: `src/components/sections/disguise.tsx` (line ~25–31, the wrapping `<div>` with the `// 02 · THE DISGUISE` text)
- Modify: `src/components/sections/scale.tsx` (line ~44 wrapper)
- Modify: `src/components/sections/velocity.tsx` (line ~32–34 `<p>`)
- Modify: `src/components/sections/reliability.tsx` (line ~53 wrapper)
- Modify: `src/components/sections/efficiency.tsx` (line ~72 wrapper)
- Modify: `src/components/sections/reach.tsx` (line ~87 wrapper)
- Modify: `src/components/sections/origin.tsx` (line ~75 wrapper)
- Modify: `src/components/sections/principles.tsx` (line ~100 wrapper)
- Modify: `src/components/sections/ab-test.tsx` (line ~201 wrapper)

- [ ] **Step 1: Add `id` attribute to each marker**

For each file, locate the element wrapping the `// NN · LABEL` literal and add `id="${slug}-marker"` (slug per `LABS` manifest). The slugs are: `disguise`, `scale`, `velocity`, `reliability`, `efficiency`, `reach`, `origin`, `principles`, `lab`.

Example — `velocity.tsx` line 32–34:

```tsx
<p id="velocity-marker" className="font-mono text-sm uppercase tracking-widest text-amber">
  {"// 04 · VELOCITY"}
</p>
```

Example — `disguise.tsx` lines 25–31:

```tsx
<div
  id="disguise-marker"
  className={clsx(
    "mb-8 font-mono text-xs uppercase tracking-[0.3em] text-mute-300",
  )}
>
  {"// 02 · THE DISGUISE"}
</div>
```

Use the slug from `LABS` (e.g., AB-test slug is `lab`, not `ab-test` or `abtest`). Verify against `src/labs/manifest.ts`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Smoke-check via dev server**

Dev is already running at https://alexkafer.localhost:1355. Confirm markers exist in DOM:

```bash
curl -sk https://alexkafer.localhost:1355/ | grep -oE 'id="[a-z]+-marker"' | sort -u
```

Expected: 9 unique marker IDs (`disguise-marker`, `scale-marker`, `velocity-marker`, `reliability-marker`, `efficiency-marker`, `reach-marker`, `origin-marker`, `principles-marker`, `lab-marker`).

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/
git commit -m "feat(sections): add DOM markers to // NN labels for star anchoring

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Add `LAYOUTS.parked` and trim section-layouts

**Files:**
- Modify: `src/components/hero/section-layouts.ts`

- [ ] **Step 1: Replace `section-layouts.ts` contents**

Replace the entire file with:

```ts
// Constellation layouts.
//
// Two layouts only:
//   cloud  — the hero state (tight wobbling cloud near origin).
//   parked — the post-hero state (sparse 3-D ellipsoid filling the viewport
//            with real depth). The active section's star then peels off the
//            parked target each frame and DOM-anchors to its // NN label.
//
// `personality(i, total)` is a stable per-node RNG so each node has a
// consistent identity across layouts.

export type LayoutFn = (
  i: number,
  total: number,
  spread: { x: number; y: number; z: number },
) => [number, number, number];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function personality(i: number, total: number) {
  const rand = lcg(7919 + i * 131 + total);
  return { a: rand(), b: rand(), c: rand(), d: rand() };
}

const cloud: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const angle = (i / total) * Math.PI * 2 + p.a * 0.6;
  const radial = 0.45 + p.b * 0.55;
  return [
    Math.cos(angle) * radial * spread.x,
    Math.sin(angle) * radial * spread.y,
    (p.c * 2 - 1) * spread.z,
  ];
};

// Sparse 3-D ellipsoid using golden-angle spiral on a flattened sphere.
// X spread ~1.6×, Y spread ~1.4×, Z spread ~3.5× the cloud spread so we get
// real depth and stars feel "exploded out" rather than a tight ring.
const PARKED_X = 1.6;
const PARKED_Y = 1.4;
const PARKED_Z = 3.5;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const parked: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  // Golden-angle spiral on a unit sphere → uniform-ish coverage.
  const t = (i + 0.5) / total;
  const phi = Math.acos(1 - 2 * t);          // 0..π
  const theta = GOLDEN * i;                  // azimuth
  const sx = Math.sin(phi) * Math.cos(theta);
  const sy = Math.sin(phi) * Math.sin(theta);
  const sz = Math.cos(phi);
  // Per-node jitter so it doesn't read as a perfect spiral.
  const jx = (p.a * 2 - 1) * 0.12;
  const jy = (p.b * 2 - 1) * 0.12;
  const jz = (p.d * 2 - 1) * 0.18;
  return [
    (sx + jx) * spread.x * PARKED_X,
    (sy + jy) * spread.y * PARKED_Y,
    (sz + jz) * spread.z * PARKED_Z,
  ];
};

export const LAYOUTS = {
  cloud,
  parked,
} as const;

export type LayoutId = keyof typeof LAYOUTS;
```

This deletes `frameRight`, `corners`, `sweep`, `ring`, `curve`, `grid4`, `wide`, `triCluster`, `dualColumn`, `xray`, plus the `SECTIONS`/`SectionEntry` exports. Callers in Task 3 will switch to `LABS`.

- [ ] **Step 2: Type-check (will fail until Task 3)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors in `constellation-background.tsx` and `hero-scene.tsx` referencing `SECTIONS` / unused layouts. That's fine — Task 3 fixes constellation-background; Task 5 fixes hero-scene.

- [ ] **Step 3: Do NOT commit yet** — commit at end of Task 3 once tsc passes again.

---

## Task 3: Switch ScrollDriver to LABS

**Files:**
- Modify: `src/components/hero/constellation-background.tsx`

- [ ] **Step 1: Replace SECTIONS import with LABS**

Change:

```ts
import { SECTIONS } from "./section-layouts";
```

To:

```ts
import { LABS } from "@/labs";
```

- [ ] **Step 2: Update ScrollDriver to use LABS**

Inside `ScrollDriver`, replace the two references to `SECTIONS`:

```ts
const elements = LABS.map((s) => document.getElementById(s.slug));
```

and

```ts
const nextIndex = Math.min(LABS.length - 1, activeIndex + 1);
```

(`SECTIONS.length` is the only other reference — there's a single line `Math.min(SECTIONS.length - 1, activeIndex + 1)` to change.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v hero-scene | head -10
```

Expected: only `hero-scene.tsx` errors remain (handled in Task 5).

- [ ] **Step 4: Commit Tasks 2 + 3 together**

```bash
git add src/components/hero/section-layouts.ts src/components/hero/constellation-background.tsx
git commit -m "feat(hero): add LAYOUTS.parked, drop morph layouts, route ScrollDriver via LABS

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: section-stars + dom-anchor helpers

**Files:**
- Create: `src/components/hero/section-stars.ts`
- Create: `src/components/hero/dom-anchor.ts`

- [ ] **Step 1: Create `section-stars.ts`**

```ts
// Maps section indices (1..LABS.length-1) to indices in the constellation
// node array. Picks well-spread nodes so the line bundles look balanced.
//
// Also exposes computeNeighborPairs() which returns each section's 2–3
// nearest section-star siblings (for line bundles).

import * as THREE from "three";
import { LAYOUTS } from "./section-layouts";
import { LABS } from "@/labs";

export type SectionAssignment = {
  // sectionIndex (1..LABS.length-1) → constellation node index (0..nodeCount-1)
  sectionToStar: Map<number, number>;
  // Reverse: node index → sectionIndex (or undefined if ambient)
  starToSection: Map<number, number>;
};

const NEIGHBORS_PER_SECTION = 3;

// Greedy farthest-point sampling: pick 9 nodes that are maximally spread in
// parked space. Stable per (nodeCount, spread shape) — does not depend on
// runtime randomness because LAYOUTS.parked is deterministic.
export function assignSectionStars(
  nodeCount: number,
  spread: { x: number; y: number; z: number },
): SectionAssignment {
  const sectionCount = LABS.length - 1; // exclude hero
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const [x, y, z] = LAYOUTS.parked(i, nodeCount, spread);
    positions.push(new THREE.Vector3(x, y, z));
  }

  const chosen: number[] = [];
  // Start with node 0 for determinism.
  chosen.push(0);
  while (chosen.length < sectionCount && chosen.length < nodeCount) {
    let bestIdx = -1;
    let bestMinDist = -1;
    for (let i = 0; i < nodeCount; i++) {
      if (chosen.includes(i)) continue;
      let minDist = Infinity;
      for (const c of chosen) {
        const d = positions[i].distanceTo(positions[c]);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    chosen.push(bestIdx);
  }

  const sectionToStar = new Map<number, number>();
  const starToSection = new Map<number, number>();
  for (let s = 0; s < chosen.length; s++) {
    // sectionIndex 1..N maps to chosen[0..N-1]
    sectionToStar.set(s + 1, chosen[s]);
    starToSection.set(chosen[s], s + 1);
  }
  return { sectionToStar, starToSection };
}

// For each section, find its 2-3 nearest OTHER section-stars in parked
// space. Returns a Map<sectionIndex, neighborStarIndices[]>.
export function computeNeighborPairs(
  assignment: SectionAssignment,
  nodeCount: number,
  spread: { x: number; y: number; z: number },
): Map<number, number[]> {
  const positions = new Map<number, THREE.Vector3>();
  for (const [sectionIdx, starIdx] of assignment.sectionToStar) {
    const [x, y, z] = LAYOUTS.parked(starIdx, nodeCount, spread);
    positions.set(sectionIdx, new THREE.Vector3(x, y, z));
  }
  const out = new Map<number, number[]>();
  for (const [sectionIdx, posA] of positions) {
    const others: Array<{ idx: number; dist: number }> = [];
    for (const [otherSectionIdx, posB] of positions) {
      if (otherSectionIdx === sectionIdx) continue;
      others.push({
        idx: assignment.sectionToStar.get(otherSectionIdx)!,
        dist: posA.distanceTo(posB),
      });
    }
    others.sort((a, b) => a.dist - b.dist);
    out.set(sectionIdx, others.slice(0, NEIGHBORS_PER_SECTION).map((o) => o.idx));
  }
  return out;
}
```

- [ ] **Step 2: Create `dom-anchor.ts`**

```ts
// Reads a DOM marker (id="${slug}-marker") and unprojects its on-screen
// position into 3-D world space at z=0 for the active perspective camera.
// Returns null when the element is missing OR the section is fully off-screen
// (so the caller falls back to the parked target without snapping).

import * as THREE from "three";

const ANCHOR_OFFSET_PX = 28; // gap to the LEFT of the marker text

const tmp = new THREE.Vector3();

export function getAnchorWorldPos(
  slug: string,
  camera: THREE.Camera,
  glDom: HTMLCanvasElement,
): THREE.Vector3 | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(`${slug}-marker`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const canvasRect = glDom.getBoundingClientRect();
  if (rect.bottom < canvasRect.top || rect.top > canvasRect.bottom) {
    return null; // fully out of view
  }
  // Star sits to the LEFT of the marker, vertically centred on it.
  const screenX = rect.left - ANCHOR_OFFSET_PX;
  const screenY = rect.top + rect.height / 2;
  // Convert to NDC (-1..1) relative to the canvas.
  const ndcX = ((screenX - canvasRect.left) / canvasRect.width) * 2 - 1;
  const ndcY = -(((screenY - canvasRect.top) / canvasRect.height) * 2 - 1);
  // Unproject NDC point at z=0.5 (mid clip), then project to z=0 plane.
  tmp.set(ndcX, ndcY, 0.5);
  tmp.unproject(camera);
  const dir = tmp.sub(camera.position).normalize();
  if (Math.abs(dir.z) < 1e-6) return null;
  const distance = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(distance));
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v hero-scene | head -10
```

Expected: still only `hero-scene.tsx` errors (which Task 5 fixes).

- [ ] **Step 4: Commit**

```bash
git add src/components/hero/section-stars.ts src/components/hero/dom-anchor.ts
git commit -m "feat(hero): section-star assignment + DOM-anchor helpers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Rewire hero-scene.tsx

This is the heart of the change. Apply edits to `src/components/hero/hero-scene.tsx`.

**Files:**
- Modify: `src/components/hero/hero-scene.tsx`
- Will become unused: `src/components/hero/flyby-star.tsx` (delete in Task 6)

- [ ] **Step 1: Update imports**

Change the existing imports to:

```tsx
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HERO_DEFAULT_NODE_COUNT } from "./use-hero-nodes";
import { LAYOUTS } from "./section-layouts";
import { getScrollState } from "./scroll-state";
import { LABS } from "@/labs";
import { labColor } from "./lab-color";
import {
  assignSectionStars,
  computeNeighborPairs,
  type SectionAssignment,
} from "./section-stars";
import { getAnchorWorldPos } from "./dom-anchor";
```

(Removed: `useState`, `subscribeScrollState`, `FlybyStar`.)

- [ ] **Step 2: Add module-level color constants**

Just below the existing `const NODE_COLOR = "#7dd3fc";` line, add:

```tsx
const NODE_COLOR_VEC = new THREE.Color(NODE_COLOR);
const ACTIVE_SCALE = 1.4;
const ACTIVE_EMISSIVE = 1.0;
const BASE_EMISSIVE = 0.6;
```

- [ ] **Step 3: Add per-node target color cache helper**

Above `function ConstellationNodes(`, add:

```tsx
function makeNodeColors(
  nodeCount: number,
  assignment: SectionAssignment,
): THREE.Color[] {
  const out: THREE.Color[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const sectionIdx = assignment.starToSection.get(i);
    if (sectionIdx !== undefined) {
      const meta = LABS[sectionIdx];
      out.push(meta ? labColor(meta) : NODE_COLOR_VEC.clone());
    } else {
      out.push(NODE_COLOR_VEC.clone());
    }
  }
  return out;
}
```

- [ ] **Step 4: Replace `ConstellationNodes` props + body**

Replace the entire `ConstellationNodes` component (the function and its props
type) with:

```tsx
function ConstellationNodes({
  nodes,
  cursor,
  spread,
  nodeSize,
  cursorRadius,
  cursorStrength,
  positionsRef,
  reduced,
  assignment,
  parkedColors,
}: {
  nodes: LiveNode[];
  cursor: React.MutableRefObject<CursorState>;
  spread: { x: number; y: number; z: number };
  nodeSize: number;
  cursorRadius: number;
  cursorStrength: number;
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  reduced: boolean;
  assignment: SectionAssignment;
  parkedColors: THREE.Color[];
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useRef<THREE.Vector3[]>(nodes.map(() => new THREE.Vector3()));
  const projected = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const colorTmp = useRef(new THREE.Color());
  const cloudTarget = useRef(new THREE.Vector3());
  const parkedTarget = useRef(new THREE.Vector3());
  const blendedTarget = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  // Initialize each node's base to its hero/cloud layout so the first frame
  // doesn't snap from the origin.
  useEffect(() => {
    const layout = LAYOUTS.cloud;
    nodes.forEach((n, i) => {
      const [x, y, z] = layout(i, nodes.length, spread);
      n.base.set(x, y, z);
    });
  }, [nodes, spread]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sc = getScrollState().current;

    // 1 in pure hero, 0 throughout section view.
    const heroBlend = sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const inSectionView = sc.activeIndex >= 1;
    const activeStarIdx = inSectionView
      ? assignment.sectionToStar.get(sc.activeIndex)
      : undefined;
    const activeMeta = inSectionView ? LABS[sc.activeIndex] : undefined;
    const activeAnchorPos =
      inSectionView && activeMeta
        ? getAnchorWorldPos(activeMeta.slug, camera, gl.domElement)
        : null;

    if (cursor.current.active) {
      projected.current.set(cursor.current.x, cursor.current.y, 0.5);
      projected.current.unproject(camera);
      const dir = projected.current.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      projected.current.copy(camera.position).add(dir.multiplyScalar(distance));
    }

    const cloudFn = LAYOUTS.cloud;
    const parkedFn = LAYOUTS.parked;

    nodes.forEach((node, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;

      const cArr = cloudFn(i, nodes.length, spread);
      const pArr = parkedFn(i, nodes.length, spread);
      cloudTarget.current.set(cArr[0], cArr[1], cArr[2]);
      parkedTarget.current.set(pArr[0], pArr[1], pArr[2]);
      blendedTarget.current.copy(parkedTarget.current).lerp(cloudTarget.current, heroBlend);

      // Active section star: override base target with DOM anchor when present.
      const isActiveStar = i === activeStarIdx;
      if (isActiveStar && activeAnchorPos) {
        node.a.copy(activeAnchorPos);
      } else {
        node.a.copy(blendedTarget.current);
      }

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
      // Active star wobbles less so it sits cleanly beside the marker.
      const wobbleAtten = isActiveStar && activeAnchorPos ? 0.15 : 1;
      const baseX = node.base.x + ox * wobbleAtten;
      const baseY = node.base.y + oy * wobbleAtten;
      const baseZ = node.base.z + oz * wobbleAtten;

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

      // Scale: active star bigger.
      const targetScale = isActiveStar && activeAnchorPos ? ACTIVE_SCALE : 1;
      mesh.scale.lerp(
        tmp.current.set(targetScale, targetScale, targetScale),
        0.15,
      );

      // Color: blend cloud color → parked color by (1 - heroBlend).
      const mat = mesh.material as THREE.MeshStandardMaterial;
      colorTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend);
      mat.color.copy(colorTmp.current);
      mat.emissive.copy(colorTmp.current);
      mat.emissiveIntensity =
        isActiveStar && activeAnchorPos ? ACTIVE_EMISSIVE : BASE_EMISSIVE;
      mat.transparent = true;
      mat.opacity = 1;
    });
  });

  return (
    <group>
      {nodes.map((node, i) => (
        <mesh
          key={node.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[nodeSize, 16, 16]} />
          <meshStandardMaterial
            color={NODE_COLOR}
            emissive={NODE_COLOR}
            emissiveIntensity={BASE_EMISSIVE}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
```

(Replaces the prior fade-by-heroBlend body. Note the `tmp.current.set(targetScale,...)` mutation is OK because it's overwritten next frame — but the cursor target reads `tmp` first; reorder didn't matter because cursor sets `target = tmp.set(0,0,0)` to start. Verified safe.)

- [ ] **Step 5: Update `ConstellationLinks` to fade by heroBlend (unchanged) and add `SectionLinks`**

The existing `ConstellationLinks` already multiplies opacity by `heroBlend` from the prior commit — keep it as-is. Add a new component `SectionLinks` immediately AFTER `ConstellationLinks` (before `PointerTracker`):

```tsx
function SectionLinks({
  positionsRef,
  assignment,
  neighborPairs,
  parkedColors,
}: {
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  assignment: SectionAssignment;
  neighborPairs: Map<number, number[]>;
  parkedColors: THREE.Color[];
}) {
  // Pre-allocate one Line per (section, neighbor) pair. We only render the
  // active section's lines by toggling opacity each frame.
  const allPairs: Array<{ section: number; from: number; to: number }> = [];
  for (const [sectionIdx, neighbors] of neighborPairs) {
    const fromIdx = assignment.sectionToStar.get(sectionIdx);
    if (fromIdx === undefined) continue;
    for (const toIdx of neighbors) {
      allPairs.push({ section: sectionIdx, from: fromIdx, to: toIdx });
    }
  }

  const lineRefs = useRef<(THREE.Object3D | null)[]>([]);
  const segBuffer = useRef<Float32Array>(new Float32Array(6));

  useFrame(() => {
    const sc = getScrollState().current;
    const heroBlend = sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const sectionFade = 1 - heroBlend; // 0 in hero, 1 in section view

    allPairs.forEach((pair, k) => {
      const obj = lineRefs.current[k] as unknown as {
        geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
        material?: { opacity?: number; transparent?: boolean };
      } | null;
      if (!obj?.geometry?.setPositions) return;
      const a = positionsRef.current[pair.from];
      const b = positionsRef.current[pair.to];
      if (!a || !b) return;
      const buf = segBuffer.current;
      buf[0] = a.x; buf[1] = a.y; buf[2] = a.z;
      buf[3] = b.x; buf[4] = b.y; buf[5] = b.z;
      obj.geometry.setPositions(buf);
      if (obj.material) {
        const isActive = pair.section === sc.activeIndex;
        obj.material.transparent = true;
        obj.material.opacity = isActive ? 0.45 * sectionFade : 0;
      }
    });
  });

  return (
    <group>
      {allPairs.map((pair, k) => (
        <Line
          key={`${pair.section}-${pair.from}-${pair.to}`}
          ref={(el) => {
            lineRefs.current[k] = el as unknown as THREE.Object3D | null;
          }}
          points={[[0, 0, 0], [0, 0, 0]]}
          color={parkedColors[pair.from]}
          opacity={0}
          transparent
          lineWidth={1.2}
        />
      ))}
    </group>
  );
}
```

- [ ] **Step 6: Delete `FlybyLayer` and `FlybyStarSlot`**

Remove both functions entirely from the file.

- [ ] **Step 7: Update `Scene()` to pass new props + render `SectionLinks`**

Replace the `Scene()` function body with:

```tsx
function Scene() {
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;
  const spreadX = halfW * 0.88;
  const spreadY = halfH * 0.78;
  const spreadZ = Math.min(spreadX, spreadY) * 0.35;
  const minDim = Math.min(spreadX, spreadY);

  const isPortrait = viewport.width < viewport.height;
  const isCompact = viewport.width < 6;
  const nodeCount = isCompact ? 16 : isPortrait ? 20 : HERO_DEFAULT_NODE_COUNT;

  const ampScale = minDim;
  const nodes = useMemo(
    () => makeLiveNodes(nodeCount, ampScale, spreadZ),
    [nodeCount, ampScale, spreadZ],
  );

  const spread = useMemo(
    () => ({ x: spreadX, y: spreadY, z: spreadZ }),
    [spreadX, spreadY, spreadZ],
  );

  const assignment = useMemo(
    () => assignSectionStars(nodeCount, spread),
    [nodeCount, spread],
  );

  const neighborPairs = useMemo(
    () => computeNeighborPairs(assignment, nodeCount, spread),
    [assignment, nodeCount, spread],
  );

  const parkedColors = useMemo(
    () => makeNodeColors(nodeCount, assignment),
    [nodeCount, assignment],
  );

  const nodeSize = Math.max(0.06, minDim * 0.025);
  const linkDistance = minDim * 0.9;
  const cursorRadius = minDim * 0.55;
  const cursorStrength = 0.6;

  const cursor = useRef<CursorState>({ x: 0, y: 0, active: false });
  const positionsRef = useRef<THREE.Vector3[]>([]);
  if (positionsRef.current.length !== nodes.length) {
    positionsRef.current = nodes.map(() => new THREE.Vector3());
  }

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} intensity={1.2} />
      <Starfield />
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
        linkDistance={linkDistance}
      />
      <SectionLinks
        positionsRef={positionsRef}
        assignment={assignment}
        neighborPairs={neighborPairs}
        parkedColors={parkedColors}
      />
      <PointerTracker cursor={cursor} />
    </>
  );
}
```

(Note: the existing `Scene()` already had the same lights/Starfield/PointerTracker structure — preserve them. The diff is: add `spread`, `assignment`, `neighborPairs`, `parkedColors` memos; pass them to `ConstellationNodes`; render `<SectionLinks />`; drop `<FlybyLayer />`.)

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 9: Visual smoke**

Dev server is running at https://alexkafer.localhost:1355.

```bash
curl -skI https://alexkafer.localhost:1355/ | head -1
tail -20 /tmp/portless-dev.log
```

Expected: `HTTP/2 200`, no fresh errors in the log.

- [ ] **Step 10: Commit**

```bash
git add src/components/hero/hero-scene.tsx
git commit -m "feat(hero): anchored constellation — cloud→parked morph + DOM-anchored section star

Replaces flyby comet with a single coherent constellation. Stars expand
from the hero cloud into a sparse 3-D parked layout. The active section's
owned star (well-spread assignment of 9 nodes) DOM-anchors to its
// NN marker, scaled up and connected to its 3 nearest section-star
siblings via fading line bundles.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Delete dead flyby code

**Files:**
- Delete: `src/components/hero/flyby-star.tsx`

- [ ] **Step 1: Verify no remaining references**

```bash
grep -rn "flyby-star\|FlybyStar" src/ docs/ 2>/dev/null
```

Expected: only references in spec/plan markdown files (in `docs/`) and the prior session's checkpoint files. No references in `src/`.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/hero/flyby-star.tsx
```

- [ ] **Step 3: Type-check + lint + build**

```bash
npx tsc --noEmit && npm run lint && rm -rf .next && npm run build 2>&1 | tail -10
```

Expected: all pass. Build flake (`Cannot find module for page: /api/ab/*` etc.) — retry up to 2× as documented.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(hero): remove dead flyby-star component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Visual verification + capture

**Files:** none (verification only).

- [ ] **Step 1: Confirm dev server is running**

```bash
curl -skI https://alexkafer.localhost:1355/ | head -1
```

Expected: `HTTP/2 200`. (Reuse the existing dev server per copilot-instructions; do NOT start another.)

- [ ] **Step 2: Playwright sweep**

Use the playwright-cli skill. At viewport 1440×900, capture screenshots at:
1. Hero (scrollY=0) — cloud constellation visible, no anchored star.
2. For each of the 9 sections (`disguise`...`lab`): scroll the marker into the upper-left third of the viewport, wait 1.5s for lerp, screenshot. Confirm:
   - The cloud has expanded into the parked layout (sparser, 3-D depth visible).
   - One bigger, color-coded star sits to the LEFT of the `// NN · LABEL` text.
   - 3 lines reach from that star to other (drifting) stars.
   - Star and lines move WITH the page as you scroll within the section.

Save to `.flyby-verify/anchored/` (already gitignored under `.flyby-verify/`).

- [ ] **Step 3: Sanity-check scroll-tracking**

Manually (via playwright keyboard) scroll within ONE section (e.g., velocity) by 200px and re-screenshot. The star should have moved with the page (its on-screen Y position should shift the same amount as the marker). If it lags or detaches, that's a bug.

- [ ] **Step 4: Inspect logs**

```bash
grep -iE "error|warn" /tmp/portless-dev.log | tail -20
```

Expected: no new errors related to the change. Pre-existing Cloudflare DurableObject warnings are fine.

- [ ] **Step 5: Final commit (if any verification fixups happened)**

If everything is clean, no commit needed. Otherwise:

```bash
git add <fixed-files>
git commit -m "fix(hero): <specific fix from verification>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-review checklist (controller, before dispatching)

- [x] Spec coverage: every "Behaviour contract" bullet maps to a task (markers→T1, parked layout→T2, scroll driver→T3, assignment+anchor→T4, scene rewire→T5, cleanup→T6, verify→T7).
- [x] No placeholders.
- [x] Type consistency: `SectionAssignment.sectionToStar`/`starToSection` referenced consistently across T4 and T5; `getAnchorWorldPos(slug, camera, glDom)` signature matches the call site in T5.
- [x] DRY: `heroBlend` formula identical in `ConstellationNodes`, `ConstellationLinks` (existing), and `SectionLinks` (new). Could be extracted into a helper but the duplication is 1 line × 3 sites and the cost of the import outweighs the saving.
- [x] YAGNI: dropped section-flyby code in T6 rather than letting it linger.
- [x] TDD: this is animation/visual code with no existing test harness — verification is via playwright in T7. Acceptable per the existing project conventions (no animation unit tests today).
