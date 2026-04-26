// src/labs/manifest.ts

import type { LabMeta } from "./types";

export const heroMeta: LabMeta = {
  slug: "hero",
  title: "Hello",
  blurb: "Senior PM, Xbox Platform.",
  version: "v0.0",
  status: "shipped",
  tags: ["intro"],
  order: 0,
};

export const disguiseMeta: LabMeta = {
  slug: "resume",
  title: "RÉSUMÉ",
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
