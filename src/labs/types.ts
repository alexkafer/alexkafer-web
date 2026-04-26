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
