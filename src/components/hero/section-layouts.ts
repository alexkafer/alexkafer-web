// Constellation layouts.
//
// TWO LAYOUTS, ONE IDENTITY
// -------------------------
// Each star has a stable index `i`. `personality(i, total)` is a seeded RNG
// so the star's "personality" (radial offset, depth, jitter) is identical
// across layouts and renders. `cloudAngle(i, total)` is the *angular slot*
// that both layouts use as their base direction — that's what makes the
// cloud→parked morph feel like a radial bloom rather than a swarm flying
// across the viewport.
//
//   cloud   — hero state. Tight wobbling annulus near origin. Radius
//             0.45..1.0 × spread.
//   parked  — post-hero state. Same angular slot per star, but pushed
//             outward to PARKED_RADIAL_MIN..MAX × spread × {PARKED_X,Y,Z}.
//             A scroll-driven Z-rotation is layered on top at runtime
//             (see hero-scene.tsx → ConstellationNodes / parkedRotation).
//
// SECTION ANCHORS
// ---------------
// Some stars are picked as "section anchors" by section-stars.ts using
// `cloudAngle()`. Section 1 owns the star nearest LEFT-CENTER (angle π);
// each subsequent section walks clockwise around the ring by
// `2π / sectionCount`. When a section is active, that star peels off the
// (rotated) parked target each frame and DOM-anchors to its heading.
//
// COMMON TWEAKS
// -------------
//   PARKED_RADIAL_MIN/MAX  — how far stars expand from origin in parked.
//   PARKED_X/Y/Z           — ellipsoid shape (Y < X = wider than tall;
//                            Z >> 1 gives strong depth parallax).
//   PARKED_ANGULAR_JITTER  — how much each star can drift from its slot
//                            (radians). Larger = looser ring, more variety.
//   cloud()'s `0.45 + p.b * 0.55` — hero ring density.
//   cloud()'s `+ p.a * 0.6`       — hero angular jitter.

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

// Stable per-node cloud angle. Exported so star-assignment logic can pick
// section anchors by angular position without re-deriving the formula.
export function cloudAngle(i: number, total: number): number {
  const p = personality(i, total);
  return (i / total) * Math.PI * 2 + p.a * 0.6;
}

const cloud: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const angle = cloudAngle(i, total);
  const radial = 0.45 + p.b * 0.55;
  return [
    Math.cos(angle) * radial * spread.x,
    Math.sin(angle) * radial * spread.y,
    (p.c * 2 - 1) * spread.z,
  ];
};

// Parked layout projects each star radially OUTWARD from its cloud angle
// rather than scattering across the viewport. This way the cloud→parked
// morph feels like an "expansion" rather than stars flying through one
// another. Z depth and small angular jitter come from the personality RNG
// so the ellipsoid still has variety and real depth.
const PARKED_X = 1.5;
const PARKED_Y = 1.3;
const PARKED_Z = 3.0;
const PARKED_RADIAL_MIN = 0.85;
const PARKED_RADIAL_MAX = 1.05;
const PARKED_ANGULAR_JITTER = 0.18; // radians

const parked: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const angle = cloudAngle(i, total) + (p.d * 2 - 1) * PARKED_ANGULAR_JITTER;
  const radial =
    PARKED_RADIAL_MIN + p.c * (PARKED_RADIAL_MAX - PARKED_RADIAL_MIN);
  const z = (p.b * 2 - 1) * spread.z * PARKED_Z;
  return [
    Math.cos(angle) * radial * spread.x * PARKED_X,
    Math.sin(angle) * radial * spread.y * PARKED_Y,
    z,
  ];
};

export const LAYOUTS = {
  cloud,
  parked,
} as const;

export type LayoutId = keyof typeof LAYOUTS;
