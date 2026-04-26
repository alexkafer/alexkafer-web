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
