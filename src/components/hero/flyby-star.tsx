// src/components/hero/flyby-star.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabMeta } from "@/labs/types";
import { labColor } from "./lab-color";

const TRAIL_LENGTH = 30;

type Props = {
  /** Lab metadata for color, side override, etc. */
  meta: LabMeta;
  /** 0-based section index used for parity-based side selection. */
  sectionIndex: number;
  /** 0..1 master fade — gate visibility while constellation cross-fades. */
  opacity: number;
};

const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * One section's lab star. Enters from off-screen below, sweeps up past the
 * section header, exits off-screen above as the section's DOM element scrolls
 * past the viewport. Side alternates by section parity unless the lab
 * overrides via `meta.flybySide`. Progress is derived from `meta.slug`'s DOM
 * element each frame:
 *   t = 0 when section's top is at viewport bottom (just entered)
 *   t = 1 when section's bottom is at viewport top (just exited)
 *
 * Mounted twice at most at any one time (active + next during transitions).
 */
export function FlybyStar({ meta, sectionIndex, opacity }: Props) {
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;

  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments | null>(null);

  // Trail buffers — preallocated, mutated in useFrame.
  const trail = useMemo(() => {
    // (TRAIL_LENGTH - 1) segments * 2 endpoints * 3 components
    const segments = TRAIL_LENGTH - 1;
    const positions = new Float32Array(segments * 2 * 3);
    const colors = new Float32Array(segments * 2 * 3);
    const history: THREE.Vector3[] = Array.from(
      { length: TRAIL_LENGTH },
      () => new THREE.Vector3(),
    );
    const primed = { value: false };
    return { positions, colors, history, segments, primed };
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(trail.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(trail.colors, 3));
    return g;
  }, [trail]);

  // Re-prime on mount / when key props change so the trail doesn't snap
  // from the previous lab's tail. The actual fill happens on the first
  // useFrame using the computed head position (avoids drawing a streak
  // from off-screen-bottom to mid-viewport when the star mounts mid-section).
  useEffect(() => {
    trail.primed.value = false;
  }, [meta.slug, trail]);

  const baseColor = useMemo(() => labColor(meta), [meta]);

  useFrame(() => {
    const mesh = meshRef.current;
    const line = lineRef.current;
    if (!mesh) return;

    // Compute progress from this section's DOM element.
    let progress = 0;
    if (typeof window !== "undefined") {
      const el = document.getElementById(meta.slug);
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when top is at viewport bottom (rect.top === vh),
        // 1 when bottom is at viewport top (rect.bottom === 0).
        const traveled = vh - rect.top;
        const travel = rect.height + vh;
        progress = clamp01(traveled / Math.max(travel, 1));
      }
    }

    // Side selection.
    const explicit = meta.flybySide;
    const side =
      explicit === "left" ? -1 : explicit === "right" ? 1 : sectionIndex % 2 === 1 ? -1 : 1;

    // y(t): off-screen below to off-screen above with mild ease.
    const t = ease(progress);
    const y = -halfH * 1.15 + t * halfH * 2.3;

    // x(t): start out near the edge, drift inward as we rise so the star
    // sweeps past the section header.
    const x = side * halfW * (0.65 - 0.15 * t);

    // z(t): small forward bulge at center for depth.
    const z = 0.3 * Math.sin(progress * Math.PI);

    mesh.position.set(x, y, z);

    // Scale peaks at center, smaller at entry/exit.
    const scale = 0.6 + 0.6 * Math.sin(progress * Math.PI);
    const baseSize = Math.max(0.05, Math.min(halfW, halfH) * 0.04);
    mesh.scale.setScalar(scale * baseSize * 5);

    // Material color + opacity.
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(baseColor);
    mat.emissive.copy(baseColor);
    mat.emissiveIntensity = 0.9;
    mat.opacity = opacity;
    mat.transparent = true;

    // Lazy-prime: fill all history slots with the first real head position so
    // the trail starts as a single point at the head rather than streaking
    // from a stale reset value.
    if (!trail.primed.value) {
      for (const v of trail.history) v.set(x, y, z);
      trail.primed.value = true;
    }

    // Update trail history (push head, drop tail).
    for (let i = trail.history.length - 1; i > 0; i--) {
      trail.history[i].copy(trail.history[i - 1]);
    }
    trail.history[0].set(x, y, z);

    // Rebuild line segments + per-vertex colors.
    if (line) {
      const { positions, colors, segments, history } = trail;
      for (let i = 0; i < segments; i++) {
        const a = history[i];
        const b = history[i + 1];
        positions[i * 6 + 0] = a.x;
        positions[i * 6 + 1] = a.y;
        positions[i * 6 + 2] = a.z;
        positions[i * 6 + 3] = b.x;
        positions[i * 6 + 4] = b.y;
        positions[i * 6 + 5] = b.z;

        // Head bright, tail transparent. Multiplied into vertex color so the
        // additive line material falls off naturally.
        const fadeA = (1 - i / segments) * opacity;
        const fadeB = (1 - (i + 1) / segments) * opacity;
        colors[i * 6 + 0] = baseColor.r * fadeA;
        colors[i * 6 + 1] = baseColor.g * fadeA;
        colors[i * 6 + 2] = baseColor.b * fadeA;
        colors[i * 6 + 3] = baseColor.r * fadeB;
        colors[i * 6 + 4] = baseColor.g * fadeB;
        colors[i * 6 + 5] = baseColor.b * fadeB;
      }
      const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
      const colAttr = geom.getAttribute("color") as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.9}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={opacity}
        />
      </mesh>
      <lineSegments
        ref={lineRef}
        geometry={geom}
      >
        <lineBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1.5}
        />
      </lineSegments>
    </group>
  );
}
