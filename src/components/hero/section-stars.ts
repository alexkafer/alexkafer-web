// Section anchor assignment + neighbor pairs.
//
// HOW SECTIONS GET A STAR
// -----------------------
// Every section in the manifest (LABS, minus the hero at index 0) needs one
// "anchor" star — the star that physically migrates to that section's
// heading when the user scrolls there.
//
// Anchors are picked by *angular slot*, not by position:
//   1. Compute each candidate star's `cloudAngle(i, total)`.
//   2. Section 1 owns the star whose angle is nearest LEFT_ANGLE (π,
//      i.e., 9 o'clock — where the heading text sits).
//   3. Section 2 takes the nearest unclaimed star to (LEFT_ANGLE - step),
//      where step = 2π / sectionCount. Each subsequent section walks
//      clockwise (math angle decreases ⇒ visually clockwise on a y-up
//      canvas).
//   4. Continue until every section has one anchor.
//
// HOW THE CONSTELLATION KEEPS HEADINGS ON THE LEFT
// ------------------------------------------------
// hero-scene.tsx applies a scroll-driven rotation to the parked layout
// (see `parkedRotation` in ConstellationNodes.useFrame). For active section
// `s`, the rotation is `(s - 1) * angularStep`, which brings that section's
// natural slot back to LEFT. Between sections, rotation runs on its own
// fast blend curve (completes ~10% past the section midpoint) so the next
// anchor is already at LEFT by the time its heading enters the viewport.
// Because the rotation is uniform, all parked distances (and therefore
// `computeNeighborPairs` results) are unchanged.
//
// ADDING / REMOVING SECTIONS
// --------------------------
// Just add/remove an entry in `LABS` (src/labs/manifest.ts). `sectionCount`
// and `angularStep` re-derive automatically here AND in hero-scene.tsx, so
// the ring re-spaces evenly. The first non-hero entry will sit at LEFT.
//
// COMMON TWEAKS
// -------------
//   LEFT_ANGLE             — anchor "rest" position. π = left, π/2 = top,
//                            0 = right, -π/2 = bottom.
//   NEIGHBORS_PER_SECTION  — how many sibling section-anchors each
//                            section's highlight bundle connects to (used
//                            by SectionLinks in hero-scene.tsx).

import * as THREE from "three";
import { LAYOUTS, cloudAngle } from "./section-layouts";
import { LABS } from "@/labs";

export type SectionAssignment = {
  // sectionIndex (1..LABS.length-1) → constellation node index (0..nodeCount-1)
  sectionToStar: Map<number, number>;
  // Reverse: node index → sectionIndex (or undefined if ambient)
  starToSection: Map<number, number>;
};

const NEIGHBORS_PER_SECTION = 3;
// Section 1 parks at SW / bottom-left (LEFT + 45° counter-clockwise = 5π/4
// in math convention). Subsequent sections walk clockwise (decreasing math
// angle) by `angularStep`. To put section 1 at pure WEST instead, set this
// to Math.PI; for NW use Math.PI * 3/4; etc.
const LEFT_ANGLE = Math.PI + Math.PI / 4;

function angleDelta(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function assignSectionStars(
  nodeCount: number,
  // Spread is unused now that assignment is purely angular, but kept in the
  // signature so callers don't have to change.
  _spread: { x: number; y: number; z: number },
): SectionAssignment {
  void _spread;
  const sectionCount = LABS.length - 1; // exclude hero
  const angularStep = (Math.PI * 2) / sectionCount;

  const angles: Array<{ idx: number; angle: number }> = [];
  for (let i = 0; i < nodeCount; i++) {
    angles.push({ idx: i, angle: cloudAngle(i, nodeCount) });
  }

  const sectionToStar = new Map<number, number>();
  const starToSection = new Map<number, number>();
  const taken = new Set<number>();
  for (let s = 0; s < sectionCount; s++) {
    // Clockwise from LEFT (math angle decreases visually clockwise on a
    // y-up canvas).
    const desired = LEFT_ANGLE - s * angularStep;
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (const { idx, angle } of angles) {
      if (taken.has(idx)) continue;
      const d = angleDelta(angle, desired);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = idx;
      }
    }
    if (bestIdx === -1) break;
    taken.add(bestIdx);
    sectionToStar.set(s + 1, bestIdx);
    starToSection.set(bestIdx, s + 1);
  }
  return { sectionToStar, starToSection };
}

// For each section, find its 2-3 nearest OTHER section-stars in parked
// space. Returns a Map<sectionIndex, neighborStarIndices[]>. Distances are
// preserved under the runtime Z-rotation, so this can be computed once.
export function computeNeighborPairs(
  assignment: SectionAssignment,
  nodeCount: number,
  spread: { x: number; y: number; z: number },
): Map<number, number[]> {
  const positions = new Map<number, THREE.Vector3>();
  for (const [sectionIdx, starIdx] of Array.from(assignment.sectionToStar)) {
    const [x, y, z] = LAYOUTS.parked(starIdx, nodeCount, spread);
    positions.set(sectionIdx, new THREE.Vector3(x, y, z));
  }
  const out = new Map<number, number[]>();
  for (const [sectionIdx, posA] of Array.from(positions)) {
    const others: Array<{ idx: number; dist: number }> = [];
    for (const [otherSectionIdx, posB] of Array.from(positions)) {
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
