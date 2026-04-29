"use client";

import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// OrbitArc — a small "satellite" orbits a center, leaving a fading
// arc behind it that tapers to ~10° of empty space in front. Shared
// by the hero hover affordance and the /dev/orbit tuning page.
//
// First lap: tail length grows from 0 → (360° - GAP), so the visual
// reads as "p=0 dot at top → p=0.5 half arc → p=1 full ring".
// After the first lap: the head keeps circling at constant velocity,
// chasing its own tail forever.
//
// Activity is driven by `getState()` returning a center + color, or
// null when inactive. The component owns its own visibility easing
// and re-arms the orbit on every null → non-null transition.
export const ORBIT_PERIOD_MS = 2200;
export const ORBIT_RADIUS_K = 2.4;
export const ORBIT_LINE_WIDTH_PX = 1.6;
export const ORBIT_HEAD_RADIUS_K = 0.16;
export const ORBIT_GAP_RAD = (10 * Math.PI) / 180;
export const ORBIT_TAIL_SEGMENTS = 24;
export const ORBIT_SUBDIV_PER_SEG = 3;
export const ORBIT_BASE_OPACITY = 0.9;

type OrbitState = { center: THREE.Vector3 | null; color: THREE.Color | null };

export type OrbitArcProps = {
  getState: () => OrbitState;
  nodeSize: number;
};

type LineHandle = {
  geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
  material?: { opacity?: number; transparent?: boolean; color?: THREE.Color };
};

export function OrbitArc({ getState, nodeSize }: OrbitArcProps) {
  const lineRefs = useRef<(LineHandle | null)[]>(
    Array.from({ length: ORBIT_TAIL_SEGMENTS }, () => null),
  );
  const headRef = useRef<THREE.Mesh | null>(null);
  const orbitStart = useRef(0);
  const wasActive = useRef(false);
  const visibility = useRef(0);
  const { camera } = useThree();
  const rightVec = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3());
  const segBufs = useRef<Float32Array[]>(
    Array.from(
      { length: ORBIT_TAIL_SEGMENTS },
      () => new Float32Array((ORBIT_SUBDIV_PER_SEG + 1) * 3),
    ),
  );
  const lastCenter = useRef<THREE.Vector3 | null>(null);
  const lastColor = useRef<THREE.Color | null>(null);

  const initialPoints = useMemo<[number, number, number][]>(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i <= ORBIT_SUBDIV_PER_SEG; i++) arr.push([0, 0, 0]);
    return arr;
  }, []);

  useFrame(() => {
    const state = getState();
    const active = !!(state.center && state.color);

    if (active !== wasActive.current) {
      wasActive.current = active;
      if (active) orbitStart.current = performance.now();
    }
    if (state.center) lastCenter.current = state.center;
    if (state.color) lastColor.current = state.color;

    visibility.current += ((active ? 1 : 0) - visibility.current) * 0.18;
    const vis = visibility.current;

    const hideAll = () => {
      for (const lr of lineRefs.current) {
        if (lr?.material) {
          lr.material.transparent = true;
          lr.material.opacity = 0;
        }
      }
      if (headRef.current) {
        const mat = headRef.current.material as THREE.MeshBasicMaterial;
        mat.transparent = true;
        mat.opacity = 0;
      }
    };

    if (vis < 0.005) {
      hideAll();
      return;
    }

    const center = state.center ?? lastCenter.current;
    const color = state.color ?? lastColor.current;
    if (!center || !color) {
      hideAll();
      return;
    }

    rightVec.current.setFromMatrixColumn(camera.matrixWorld, 0);
    upVec.current.setFromMatrixColumn(camera.matrixWorld, 1);
    const rx = rightVec.current.x, ry = rightVec.current.y, rz = rightVec.current.z;
    const ux = upVec.current.x, uy = upVec.current.y, uz = upVec.current.z;

    const radius = nodeSize * ORBIT_RADIUS_K;
    const elapsed = performance.now() - orbitStart.current;
    const phi = (elapsed / ORBIT_PERIOD_MS) * 2 * Math.PI;
    const headAngle = phi;
    const maxTailLen = 2 * Math.PI - ORBIT_GAP_RAD;
    const tailLen = Math.min(phi, maxTailLen);

    const writePoint = (out: Float32Array, vi: number, angle: number) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      out[vi * 3]     = center.x + (ux * ca + rx * sa) * radius;
      out[vi * 3 + 1] = center.y + (uy * ca + ry * sa) * radius;
      out[vi * 3 + 2] = center.z + (uz * ca + rz * sa) * radius;
    };

    for (let s = 0; s < ORBIT_TAIL_SEGMENTS; s++) {
      const fStart = s / ORBIT_TAIL_SEGMENTS;
      const fEnd = (s + 1) / ORBIT_TAIL_SEGMENTS;
      const angleNear = headAngle - ORBIT_GAP_RAD - fStart * tailLen;
      const angleFar  = headAngle - ORBIT_GAP_RAD - fEnd   * tailLen;
      const buf = segBufs.current[s];
      for (let i = 0; i <= ORBIT_SUBDIV_PER_SEG; i++) {
        const t = i / ORBIT_SUBDIV_PER_SEG;
        const a = angleNear + (angleFar - angleNear) * t;
        writePoint(buf, i, a);
      }
      const lr = lineRefs.current[s];
      if (lr?.geometry?.setPositions) lr.geometry.setPositions(buf);
      if (lr?.material) {
        lr.material.transparent = true;
        lr.material.color?.copy(color);
        const fadeMid = (fStart + fEnd) * 0.5;
        const segOpacity = ORBIT_BASE_OPACITY * Math.pow(1 - fadeMid, 1.6);
        const lenScale = Math.min(1, tailLen / maxTailLen);
        lr.material.opacity = segOpacity * vis * (0.2 + 0.8 * lenScale);
      }
    }

    if (headRef.current) {
      const ca = Math.cos(headAngle);
      const sa = Math.sin(headAngle);
      headRef.current.position.set(
        center.x + (ux * ca + rx * sa) * radius,
        center.y + (uy * ca + ry * sa) * radius,
        center.z + (uz * ca + rz * sa) * radius,
      );
      const mat = headRef.current.material as THREE.MeshBasicMaterial;
      mat.transparent = true;
      mat.color.copy(color);
      mat.opacity = vis;
    }
  });

  return (
    <group>
      {Array.from({ length: ORBIT_TAIL_SEGMENTS }).map((_, s) => (
        <Line
          key={s}
          ref={((el: LineHandle | null) => {
            lineRefs.current[s] = el;
          }) as unknown as React.Ref<never>}
          points={initialPoints}
          color="white"
          lineWidth={ORBIT_LINE_WIDTH_PX}
          transparent
          opacity={0}
        />
      ))}
      <mesh ref={headRef}>
        <sphereGeometry args={[nodeSize * ORBIT_HEAD_RADIUS_K, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
