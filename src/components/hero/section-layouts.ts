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
