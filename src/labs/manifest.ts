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
  // slug MUST match the section's DOM id (`<Section id="...">`) AND its
  // header marker id (`<p id="${slug}-marker">`). The scroll driver in
  // constellation-background.tsx uses `getElementById(slug)` to find each
  // section, and dom-anchor.ts uses `${slug}-marker` to align stars to
  // headings.
  slug: "resume",
  title: "RÉSUMÉ",
  blurb: "Product by title, systems by practice.",
  version: "v0.2",
  status: "shipped",
  tags: ["intro"],
  order: 20,
  color: "#a78bfa",
};

export const demosMeta: LabMeta = {
  slug: "demos",
  title: "Demos",
  blurb: "Side projects, prototypes, and experiments.",
  version: "v0.3",
  status: "shipped",
  tags: ["projects"],
  order: 30,
  color: "#7dd3fc",
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
// the scroll driver's section index lines up with this array. The hero is
// index 0; everything after gets one anchor star (see section-stars.ts).
export const LABS: LabMeta[] = [heroMeta, disguiseMeta, demosMeta, labMeta];
