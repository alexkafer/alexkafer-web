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
