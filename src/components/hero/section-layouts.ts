// Per-section layouts for the page-spanning constellation.
//
// A LayoutFn returns the *target world position* for a node in that layout,
// scaled to the current viewport spread. The scene blends between the active
// section's layout and the next as the user scrolls, so the constellation
// appears to reframe each section.

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

// Stable per-node "personality" — node 7 is always the slightly-higher one in
// the band, etc. Keeps identity consistent across layouts.
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

const frameRight: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const t = (i + 0.5) / total;
  return [
    spread.x * (0.55 + p.a * 0.45),
    (t * 2 - 1) * spread.y * 0.95,
    (p.c * 2 - 1) * spread.z * 0.6,
  ];
};

const corners: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const corner = i % 4;
  const sx = corner === 0 || corner === 2 ? -1 : 1;
  const sy = corner < 2 ? 1 : -1;
  const cx = sx * spread.x * 0.78;
  const cy = sy * spread.y * 0.7;
  const j = 0.3;
  return [
    cx + (p.a * 2 - 1) * spread.x * j,
    cy + (p.b * 2 - 1) * spread.y * j,
    (p.c * 2 - 1) * spread.z,
  ];
};

const sweep: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const t = (i + 0.5) / total;
  const x = (t * 2 - 1) * spread.x * 0.95;
  const band = i % 2 === 0 ? spread.y * 0.55 : -spread.y * 0.55;
  const yJ = (p.a * 2 - 1) * spread.y * 0.18;
  return [x, band + yJ, (p.c * 2 - 1) * spread.z * 0.5];
};

const ring: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const angle = (i / total) * Math.PI * 2;
  const r = Math.min(spread.x, spread.y) * (0.85 + p.a * 0.1);
  return [
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    (p.c * 2 - 1) * spread.z * 0.4,
  ];
};

const curve: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const t = (i + 0.5) / total;
  const x = (t * 2 - 1) * spread.x * 0.95;
  const eased = Math.pow(1 - t, 2);
  const y = (eased * 2 - 1) * spread.y * 0.7 + (p.a * 2 - 1) * spread.y * 0.08;
  return [x, y, (p.c * 2 - 1) * spread.z * 0.5];
};

const grid4: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const col = i % 4;
  const cx = (col / 3) * spread.x * 1.6 - spread.x * 0.8;
  const cy = (p.a * 2 - 1) * spread.y * 0.85;
  return [
    cx + (p.b * 2 - 1) * spread.x * 0.08,
    cy,
    (p.c * 2 - 1) * spread.z * 0.5,
  ];
};

const wide: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const angle = (i / total) * Math.PI * 2 + p.a * 0.4;
  const r = 0.95 + p.b * 0.2;
  return [
    Math.cos(angle) * r * spread.x,
    Math.sin(angle) * r * spread.y,
    (p.c * 2 - 1) * spread.z * 1.2,
  ];
};

const triCluster: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const col = i % 3;
  const cx = (col - 1) * spread.x * 0.7;
  const cy = (p.a * 2 - 1) * spread.y * 0.85;
  return [
    cx + (p.b * 2 - 1) * spread.x * 0.1,
    cy,
    (p.c * 2 - 1) * spread.z * 0.5,
  ];
};

const dualColumn: LayoutFn = (i, total, spread) => {
  const p = personality(i, total);
  const side = i % 2 === 0 ? -1 : 1;
  const cx = side * spread.x * 0.7;
  const cy = (p.a * 2 - 1) * spread.y * 0.9;
  return [
    cx + (p.b * 2 - 1) * spread.x * 0.06,
    cy,
    (p.c * 2 - 1) * spread.z * 0.5,
  ];
};

export const LAYOUTS = {
  cloud, frameRight, corners, sweep, ring, curve, grid4, wide, triCluster, dualColumn,
} as const;

export type LayoutId = keyof typeof LAYOUTS;

export type SectionEntry = {
  id: string;
  label: string;
  version: string;
  layout: LayoutId;
};

// Order matches the page composition in app/page.tsx.
export const SECTIONS: SectionEntry[] = [
  { id: "hero",        label: "IDENTIFIED CONTACT", version: "v0.0", layout: "cloud" },
  { id: "disguise",    label: "THE DISGUISE",       version: "v0.2", layout: "frameRight" },
  { id: "scale",       label: "SCALE",              version: "v0.3", layout: "corners" },
  { id: "velocity",    label: "VELOCITY",           version: "v0.4", layout: "sweep" },
  { id: "reliability", label: "RELIABILITY",        version: "v0.5", layout: "ring" },
  { id: "efficiency",  label: "EFFICIENCY",         version: "v0.6", layout: "curve" },
  { id: "reach",       label: "REACH",              version: "v0.7", layout: "grid4" },
  { id: "origin",      label: "ORIGIN",             version: "v0.8", layout: "wide" },
  { id: "principles",  label: "PRINCIPLES",         version: "v0.9", layout: "triCluster" },
  { id: "lab",         label: "EXPERIMENT",         version: "v1.0", layout: "dualColumn" },
];
