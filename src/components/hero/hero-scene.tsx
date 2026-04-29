"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HERO_DEFAULT_NODE_COUNT } from "./use-hero-nodes";
import { LAYOUTS } from "./section-layouts";
import { getScrollState } from "./scroll-state";
import { LABS } from "@/labs";
import { labColor } from "./lab-color";
import {
  assignSectionStars,
  computeNeighborPairs,
  type SectionAssignment,
} from "./section-stars";
import { getAnchorWorldPos } from "./dom-anchor";
import { useTheme } from "@/lib/theme-provider";
import type { ResolvedTheme } from "@/lib/theme";
import { planetColor } from "./planet-palette";

// Camera dolly-out intro: tuck the camera deep inside the constellation so
// the ring (and cloud) wraps around outside the viewport, then pull back
// to the resting Z over INTRO_DURATION_S with ease-out-quart. Gives the
// scene a "the camera was always here, it just zoomed out to show you"
// reveal, instead of a hard pop-in once the bundle loads.
const INTRO_Z_START = 0.6;
const INTRO_Z_END = 8;
const INTRO_DURATION_S = 1.8;

// Hero scene — Three.js constellation behind the page.
//
// MOVING PARTS (in render order)
// ------------------------------
//   Starfield            — static background noise, 1500 distant points.
//   ConstellationNodes   — the live stars. Each frame, every star lerps
//                          its `base` toward a target which is:
//                            lerp(rotated_parked, cloud, heroBlend)
//                          plus per-star Lissajous wobble, plus an active
//                          DOM-anchor override for the current section's
//                          anchor star (see dom-anchor.ts).
//   ConstellationLinks   — the original "hero" graph: pairs that are close
//                          in the cloud layout. Lines persist across scroll
//                          and fade by current distance vs a per-pair
//                          cutoff (capped so parked stretching doesn't
//                          turn into spiderweb tethers).
//   SectionLinks         — section-colored highlight bundle for the active
//                          section's neighbors (see section-stars.ts).
//
// SCROLL → MOTION PIPELINE
// ------------------------
// scroll-state.ts holds { activeIndex, nextIndex, progress, blend }.
// constellation-background.tsx writes it from window.scroll using a
// "second-half-of-section is morph" heuristic (`blend = 0` for the first
// half, ramps 0→1 across the second half). Each frame this scene reads:
//   heroBlend       = (activeIndex === 0) ? (1 - blend) : 0
//   parkedRotation  = lerp(rotationFor(activeIndex), rotationFor(nextIndex),
//                          rotationBlend), where rotationFor(s) = (s-1)·step
//                          and rotationBlend ramps fast over progress
//                          [0.5, 0.6] of the section (independent of `blend`
//                          so the cloud→parked beat stays leisurely while
//                          the inter-section rotation snaps).
// See section-layouts.ts and section-stars.ts for the geometry side.
//
// COMMON TWEAKS
// -------------
//   BASE_LERP        — how fast a star chases its scroll target. Higher =
//                      snappier, lower = floatier. Only affects non-anchor
//                      stars during morph.
//   DAMPING          — how fast cursor-warp offsets relax. Higher = bouncier
//                      cursor follow, lower = more lag.
//   ACTIVE_SCALE     — size multiplier of the active anchored star.
//   ACTIVE_EMISSIVE  — glow of the active star (vs BASE_EMISSIVE).
//   STAR_COUNT       — backdrop point count. Purely cosmetic.
//
// To change WHERE stars start/end or the rotation cadence, tweak
// section-layouts.ts (geometry) or the angularStep math here.

const NODE_COLOR = "#7dd3fc";
const NODE_COLOR_VEC = new THREE.Color(NODE_COLOR);
const ACTIVE_SCALE = 1.4;
const ACTIVE_EMISSIVE = 1.0;
const BASE_EMISSIVE = 0.6;
const STAR_COUNT = 1500;
const STAR_RADIUS = 30;
const DAMPING = 0.05;
const BASE_LERP = 0.08;

const HeroThemeContext = createContext<ResolvedTheme>("dark");
function useHeroTheme(): ResolvedTheme {
  return useContext(HeroThemeContext);
}

function Starfield() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const opacities = new Float32Array(STAR_COUNT);
    let s = 9001;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    for (let i = 0; i < STAR_COUNT; i++) {
      let x = 0, y = 0, z = 0, len = 2;
      while (len > 1 || len < 0.05) {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
        len = Math.sqrt(x * x + y * y + z * z);
      }
      positions[i * 3] = x * STAR_RADIUS;
      positions[i * 3 + 1] = y * STAR_RADIUS;
      positions[i * 3 + 2] = z * STAR_RADIUS;
      opacities[i] = 0.4 + rand() * 0.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    return g;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.02}
        sizeAttenuation
        color="#cfe7ff"
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

type CursorState = { x: number; y: number; active: boolean };

type LiveNode = {
  id: string;
  base: THREE.Vector3; // morphed base, lerps toward scroll target
  a: THREE.Vector3;    // scratch
  b: THREE.Vector3;    // scratch
  liss: { ampX: number; ampY: number; ampZ: number; phaseX: number; phaseY: number; phaseZ: number; speed: number };
};

function makeLiveNodes(count: number, ampScale: number, ampZ: number): LiveNode[] {
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: LiveNode[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `node-${String(i + 1).padStart(2, "0")}`,
      base: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      liss: {
        ampX: (0.04 + rand() * 0.05) * ampScale,
        ampY: (0.04 + rand() * 0.05) * ampScale,
        ampZ: (0.05 + rand() * 0.08) * Math.max(ampZ, 0.6),
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        phaseZ: rand() * Math.PI * 2,
        speed: 0.22 + rand() * 0.3,
      },
    });
  }
  return out;
}

function makeNodeColors(
  nodeCount: number,
  assignment: SectionAssignment,
): THREE.Color[] {
  const out: THREE.Color[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const sectionIdx = assignment.starToSection.get(i);
    if (sectionIdx !== undefined) {
      const meta = LABS[sectionIdx];
      out.push(meta ? labColor(meta) : NODE_COLOR_VEC.clone());
    } else {
      out.push(NODE_COLOR_VEC.clone());
    }
  }
  return out;
}

function ConstellationNodes({
  nodes,
  cursor,
  spread,
  nodeSize,
  cursorRadius,
  cursorStrength,
  positionsRef,
  reduced,
  assignment,
  parkedColors,
}: {
  nodes: LiveNode[];
  cursor: React.MutableRefObject<CursorState>;
  spread: { x: number; y: number; z: number };
  nodeSize: number;
  cursorRadius: number;
  cursorStrength: number;
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  reduced: boolean;
  assignment: SectionAssignment;
  parkedColors: THREE.Color[];
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useRef<THREE.Vector3[]>(nodes.map(() => new THREE.Vector3()));
  const projected = useRef(new THREE.Vector3());
  const dirTmp = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const colorTmp = useRef(new THREE.Color());
  const cloudTarget = useRef(new THREE.Vector3());
  const parkedTarget = useRef(new THREE.Vector3());
  const blendedTarget = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  const heroTheme = useHeroTheme();
  const themeBlend = useRef(heroTheme === "light" ? 1 : 0);
  const planetTargets = useMemo(
    () => parkedColors.map((_, i) => planetColor(i)),
    [parkedColors],
  );
  const planetTmp = useRef(new THREE.Color());
  const sunTmp = useRef(new THREE.Color());

  // Initialize each node's base to its hero/cloud layout so the first frame
  // doesn't snap from the origin.
  useEffect(() => {
    const layout = LAYOUTS.cloud;
    nodes.forEach((n, i) => {
      const [x, y, z] = layout(i, nodes.length, spread);
      n.base.set(x, y, z);
    });
  }, [nodes, spread]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sc = getScrollState().current;

    // 1 in pure hero, 0 throughout section view.
    const heroBlend = sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const inSectionView = sc.activeIndex >= 1;

    // Resolve a DOM-anchor target for every section whose marker is currently
    // in the viewport, not just the "active" one. This way an anchor star
    // snaps into place as soon as its marker scrolls into view, instead of
    // waiting for that section to become center-of-viewport active.
    const anchorOverrides = new Map<number, THREE.Vector3>();
    for (let s = 1; s < LABS.length; s++) {
      const starIdx = assignment.sectionToStar.get(s);
      if (starIdx === undefined) continue;
      const pos = getAnchorWorldPos(LABS[s].slug, camera, gl.domElement);
      if (pos) anchorOverrides.set(starIdx, pos);
    }
    const activeStarIdx = inSectionView
      ? assignment.sectionToStar.get(sc.activeIndex)
      : undefined;

    if (cursor.current.active) {
      projected.current.set(cursor.current.x, cursor.current.y, 0.5);
      projected.current.unproject(camera);
      dirTmp.current.copy(projected.current).sub(camera.position).normalize();
      const distance = -camera.position.z / dirTmp.current.z;
      projected.current.copy(camera.position).add(dirTmp.current.multiplyScalar(distance));
    }

    const cloudFn = LAYOUTS.cloud;
    const parkedFn = LAYOUTS.parked;

    // Scroll-driven Z-rotation of the parked layout: bring the upcoming
    // section's anchor star around to LEFT-CENTER (where its DOM heading
    // sits) before that section scrolls into view. Section indices walk
    // clockwise around the ring, so rotationFor(s) = (s-1) * angularStep
    // brings section s's natural slot back to LEFT.
    //
    // Rotation has its own faster blend curve (independent of `sc.blend`,
    // which paces the cloud→parked morph). The next-section header crosses
    // the bottom of the viewport at roughly progress≈0.5 of the current
    // section; we want rotation effectively complete by progress≈0.6 so
    // the anchor star is in position right as the header enters view —
    // BASE_LERP smoothing handles the visual settle from there. Tweak the
    // multiplier (currently 10) to widen/narrow that window.
    const sectionCount = Math.max(1, LABS.length - 1);
    const angularStep = (Math.PI * 2) / sectionCount;
    const rotationFor = (idx: number) =>
      idx <= 0 ? 0 : (idx - 1) * angularStep;
    const rotationBlend = Math.min(
      1,
      Math.max(0, (sc.progress - 0.5) * 10),
    );
    const r0 = rotationFor(sc.activeIndex);
    const r1 = rotationFor(sc.nextIndex);
    const parkedRotation = r0 + (r1 - r0) * rotationBlend;

    const targetBlend = heroTheme === "light" ? 1 : 0;
    themeBlend.current += (targetBlend - themeBlend.current) * 0.06;
    const tb = themeBlend.current; // 0 = sun (dark), 1 = planet (light)

    nodes.forEach((node, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;

      const cArr = cloudFn(i, nodes.length, spread);
      const pArr = parkedFn(i, nodes.length, spread);
      cloudTarget.current.set(cArr[0], cArr[1], cArr[2]);
      parkedTarget.current.set(pArr[0], pArr[1], pArr[2]);
      // Rotate parked target around +Z so the active/next section anchor
      // star drifts toward LEFT as we scroll between sections.
      if (parkedRotation !== 0) {
        const cosR = Math.cos(parkedRotation);
        const sinR = Math.sin(parkedRotation);
        const px = parkedTarget.current.x;
        const py = parkedTarget.current.y;
        parkedTarget.current.x = px * cosR - py * sinR;
        parkedTarget.current.y = px * sinR + py * cosR;
      }
      blendedTarget.current.copy(parkedTarget.current).lerp(cloudTarget.current, heroBlend);

      // Per-star DOM anchor override: any section whose marker is currently
      // visible pulls its anchor star to the marker.
      const anchorPos = anchorOverrides.get(i);
      const isActiveStar = i === activeStarIdx;
      if (anchorPos) {
        node.a.copy(anchorPos);
      } else {
        node.a.copy(blendedTarget.current);
      }

      if (reduced) {
        node.base.copy(node.a);
      } else {
        node.base.lerp(node.a, BASE_LERP);
      }

      const wobbleScale = reduced ? 0 : 1;
      const { ampX, ampY, ampZ, phaseX, phaseY, phaseZ, speed } = node.liss;
      const ox = Math.sin(t * speed + phaseX) * ampX * wobbleScale;
      const oy = Math.sin(t * speed * 1.3 + phaseY) * ampY * wobbleScale;
      const oz = Math.sin(t * speed * 0.9 + phaseZ) * ampZ * wobbleScale;
      // Stars docked to a DOM marker wobble less so they sit cleanly beside
      // the marker text.
      const wobbleAtten = anchorPos ? 0.15 : 1;
      const baseX = node.base.x + ox * wobbleAtten;
      const baseY = node.base.y + oy * wobbleAtten;
      const baseZ = node.base.z + oz * wobbleAtten;

      const target = tmp.current.set(0, 0, 0);
      if (cursor.current.active && !reduced && heroBlend > 0.5) {
        const dx = projected.current.x - baseX;
        const dy = projected.current.y - baseY;
        const dz = projected.current.z - baseZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < cursorRadius) {
          const falloff = 1 - dist / cursorRadius;
          target.set(dx, dy, dz).multiplyScalar(falloff * cursorStrength);
        }
      }
      const off = offsets.current[i];
      off.lerp(target, DAMPING);

      mesh.position.set(baseX + off.x, baseY + off.y, baseZ + off.z);
      positionsRef.current[i].copy(mesh.position);

      // Scale: active star bigger.
      const targetScale = isActiveStar && anchorPos ? ACTIVE_SCALE : 1;
      mesh.scale.lerp(
        tmp.current.set(targetScale, targetScale, targetScale),
        0.15,
      );

      // Color: blend cloud color → parked color by (1 - heroBlend).
      const mat = mesh.material as THREE.MeshStandardMaterial;

      // Sun-mode color (dark theme): existing cloud→parked blend.
      sunTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend);
      // Planet-mode color (light theme): stable planet hue, no cloud blend.
      planetTmp.current.copy(planetTargets[i]);

      // Lerp final color between the two metaphors using themeBlend.
      colorTmp.current.copy(sunTmp.current).lerp(planetTmp.current, tb);
      mat.color.copy(colorTmp.current);

      // Emissive: full sun glow at tb=0; black at tb=1 (planets don't glow).
      mat.emissive.copy(sunTmp.current).multiplyScalar(1 - tb);
      const baseEmis =
        isActiveStar && anchorPos ? ACTIVE_EMISSIVE : BASE_EMISSIVE;
      mat.emissiveIntensity = baseEmis * (1 - tb);

      // Surface: rougher / less metallic in planet mode.
      mat.roughness = 0.4 + tb * 0.5;   // 0.4 → 0.9
      mat.metalness = 0.1 - tb * 0.05;  // 0.1 → 0.05
      mat.transparent = true;
      mat.opacity = 1;
      mat.needsUpdate = true;
    });
  });

  return (
    <group>
      {nodes.map((node, i) => (
        <mesh
          key={node.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[nodeSize, 16, 16]} />
          <meshStandardMaterial
            color={NODE_COLOR}
            emissive={NODE_COLOR}
            emissiveIntensity={BASE_EMISSIVE}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function ConstellationLinks({
  nodes,
  positionsRef,
  spread,
  linkDistance,
  assignment,
}: {
  nodes: LiveNode[];
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  spread: { x: number; y: number; z: number };
  linkDistance: number;
  assignment: SectionAssignment;
}) {
  // Pair list = the *original* hero constellation graph: pairs that are
  // close in the cloud layout. We persist these across scroll and let the
  // per-pair cutoff (informed by the parked layout) handle morph fade.
  const pairs = useMemo(() => {
    const total = nodes.length;
    const cloudPos = nodes.map((_, i) => LAYOUTS.cloud(i, total, spread));
    const parkedPos = nodes.map((_, i) => LAYOUTS.parked(i, total, spread));

    // Cloud-graph threshold: ~90% of the smaller in-plane spread keeps the
    // hero "constellation" feel without webbing every star to every other.
    const cloudThresh = Math.min(spread.x, spread.y) * 0.9;

    const dist = (
      a: [number, number, number],
      b: [number, number, number],
    ) => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    const out: Array<{ i: number; j: number; cutoff: number }> = [];
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const cloudDist = dist(cloudPos[i], cloudPos[j]);
        if (cloudDist > cloudThresh) continue;

        const parkedDist = dist(parkedPos[i], parkedPos[j]);
        // Allow the cutoff to grow with parked distance so the line stays
        // visible during morph, but cap growth at 2.5× cloudDist to avoid
        // long "spiderweb" tethers across the parked ellipsoid.
        const stretched = Math.min(parkedDist, cloudDist * 2.5);
        const cutoff = Math.max(cloudDist, stretched) * 1.25;
        out.push({ i, j, cutoff });
      }
    }
    return out;
  }, [nodes, spread]);

  const lineRefs = useRef<(THREE.Object3D | null)[]>([]);
  const segBuffer = useRef<Float32Array>(new Float32Array(6));

  useFrame(() => {
    const sc = getScrollState().current;
    const inSectionView = sc.activeIndex >= 1;
    const activeStarIdx = inSectionView
      ? assignment.sectionToStar.get(sc.activeIndex)
      : undefined;

    pairs.forEach((pair, k) => {
      const { i, j, cutoff } = pair;
      const obj = lineRefs.current[k] as unknown as {
        geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
        material?: { opacity?: number; transparent?: boolean };
      } | null;
      if (!obj?.geometry?.setPositions) return;
      const a = positionsRef.current[i];
      const b = positionsRef.current[j];
      if (!a || !b) return;
      const buf = segBuffer.current;
      buf[0] = a.x; buf[1] = a.y; buf[2] = a.z;
      buf[3] = b.x; buf[4] = b.y; buf[5] = b.z;
      obj.geometry.setPositions(buf);

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (obj.material) {
        // Full opacity until 0.7×cutoff, fade to 0 at cutoff.
        const fade =
          1 - THREE.MathUtils.smoothstep(dist, cutoff * 0.7, cutoff);
        // Soft-suppress edges touching the active anchored star — the
        // SectionLinks highlight already represents that star's neighbors,
        // and the anchor pull can produce ugly tethers toward DOM labels.
        const touchesActive =
          activeStarIdx !== undefined &&
          (i === activeStarIdx || j === activeStarIdx);
        const attenuation = touchesActive ? 0.2 : 1;
        obj.material.transparent = true;
        obj.material.opacity = 0.55 * fade * attenuation;
      }
    });
  });

  // Suppress the unused-prop warning while keeping the prop in the public
  // shape (it informs cutoff sizing via spread already).
  void linkDistance;

  return (
    <group>
      {pairs.map((pair, k) => (
        <Line
          key={`${pair.i}-${pair.j}`}
          ref={(el) => {
            lineRefs.current[k] = el as unknown as THREE.Object3D | null;
          }}
          points={[[0, 0, 0], [0, 0, 0]]}
          color={NODE_COLOR}
          opacity={0.55}
          transparent
          lineWidth={1.4}
        />
      ))}
    </group>
  );
}

function SectionLinks({
  positionsRef,
  assignment,
  neighborPairs,
  parkedColors,
}: {
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  assignment: SectionAssignment;
  neighborPairs: Map<number, number[]>;
  parkedColors: THREE.Color[];
}) {
  // Pre-allocate one Line per (section, neighbor) pair. We only render the
  // active section's lines by toggling opacity each frame.
  const allPairs: Array<{ section: number; from: number; to: number }> = [];
  for (const [sectionIdx, neighbors] of Array.from(neighborPairs)) {
    const fromIdx = assignment.sectionToStar.get(sectionIdx);
    if (fromIdx === undefined) continue;
    for (const toIdx of neighbors) {
      allPairs.push({ section: sectionIdx, from: fromIdx, to: toIdx });
    }
  }

  const lineRefs = useRef<(THREE.Object3D | null)[]>([]);
  const segBuffer = useRef<Float32Array>(new Float32Array(6));

  const heroTheme = useHeroTheme();
  const linkBlend = useRef(heroTheme === "light" ? 1 : 0);

  useFrame(() => {
    const sc = getScrollState().current;
    const heroBlend = sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const sectionFade = 1 - heroBlend; // 0 in hero, 1 in section view

    const targetBlend = heroTheme === "light" ? 1 : 0;
    linkBlend.current += (targetBlend - linkBlend.current) * 0.06;
    const lb = linkBlend.current;

    allPairs.forEach((pair, k) => {
      const obj = lineRefs.current[k] as unknown as {
        geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
        material?: { opacity?: number; transparent?: boolean };
      } | null;
      if (!obj?.geometry?.setPositions) return;
      const a = positionsRef.current[pair.from];
      const b = positionsRef.current[pair.to];
      if (!a || !b) return;
      const buf = segBuffer.current;
      buf[0] = a.x; buf[1] = a.y; buf[2] = a.z;
      buf[3] = b.x; buf[4] = b.y; buf[5] = b.z;
      obj.geometry.setPositions(buf);
      if (obj.material) {
        const isActive = pair.section === sc.activeIndex;
        obj.material.transparent = true;
        obj.material.opacity = (isActive ? 0.45 * sectionFade : 0) * (1 - lb * 0.65);
      }
    });
  });

  return (
    <group>
      {allPairs.map((pair, k) => (
        <Line
          key={`${pair.section}-${pair.from}-${pair.to}`}
          ref={(el) => {
            lineRefs.current[k] = el as unknown as THREE.Object3D | null;
          }}
          points={[[0, 0, 0], [0, 0, 0]]}
          color={parkedColors[pair.from]}
          opacity={0}
          transparent
          lineWidth={1.2}
        />
      ))}
    </group>
  );
}

function PointerTracker({ cursor }: { cursor: React.MutableRefObject<CursorState> }) {
  const { gl } = useThree();
  useEffect(() => {
    const dom = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      cursor.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      cursor.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      cursor.current.active = true;
    };
    const onLeave = () => {
      cursor.current.active = false;
    };
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerleave", onLeave);
    return () => {
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerleave", onLeave);
    };
  }, [gl, cursor]);
  return null;
}

function Scene() {
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;
  const spreadX = halfW * 0.88;
  const spreadY = halfH * 0.78;
  const spreadZ = Math.min(spreadX, spreadY) * 0.35;
  const minDim = Math.min(spreadX, spreadY);

  const isPortrait = viewport.width < viewport.height;
  const isCompact = viewport.width < 6;
  const nodeCount = isCompact ? 11 : isPortrait ? 12 : HERO_DEFAULT_NODE_COUNT;

  const ampScale = minDim;
  const nodes = useMemo(
    () => makeLiveNodes(nodeCount, ampScale, spreadZ),
    [nodeCount, ampScale, spreadZ],
  );

  const spread = useMemo(
    () => ({ x: spreadX, y: spreadY, z: spreadZ }),
    [spreadX, spreadY, spreadZ],
  );

  const assignment = useMemo(
    () => assignSectionStars(nodeCount, spread),
    [nodeCount, spread],
  );

  const neighborPairs = useMemo(
    () => computeNeighborPairs(assignment, nodeCount, spread),
    [assignment, nodeCount, spread],
  );

  const parkedColors = useMemo(
    () => makeNodeColors(nodeCount, assignment),
    [nodeCount, assignment],
  );

  const nodeSize = Math.max(0.06, minDim * 0.025);
  const linkDistance = minDim * 0.9;
  const cursorRadius = minDim * 0.55;
  const cursorStrength = 0.6;

  const cursor = useRef<CursorState>({ x: 0, y: 0, active: false });
  const positionsRef = useRef<THREE.Vector3[]>([]);
  if (positionsRef.current.length !== nodes.length) {
    positionsRef.current = nodes.map(() => new THREE.Vector3());
  }

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const { resolvedTheme } = useTheme();

  return (
    <HeroThemeContext.Provider value={resolvedTheme}>
      <IntroDolly />
      <ambientLight intensity={resolvedTheme === "light" ? 0.6 : 0.4} />
      <pointLight
        position={[6, 4, 6]}
        intensity={resolvedTheme === "light" ? 1.1 : 0.6}
        color={resolvedTheme === "light" ? "#fff4d6" : "#7dd3fc"}
      />
      <PointerTracker cursor={cursor} />
      {resolvedTheme === "dark" && <Starfield />}
      <ConstellationNodes
        nodes={nodes}
        cursor={cursor}
        spread={spread}
        nodeSize={nodeSize}
        cursorRadius={cursorRadius}
        cursorStrength={cursorStrength}
        positionsRef={positionsRef}
        reduced={reduced}
        assignment={assignment}
        parkedColors={parkedColors}
      />
      <ConstellationLinks
        nodes={nodes}
        positionsRef={positionsRef}
        spread={spread}
        linkDistance={linkDistance}
        assignment={assignment}
      />
      <SectionLinks
        positionsRef={positionsRef}
        assignment={assignment}
        neighborPairs={neighborPairs}
        parkedColors={parkedColors}
      />
    </HeroThemeContext.Provider>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, INTRO_Z_END], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}

/**
 * Sits inside <Canvas> so it can read the active camera. The Canvas mounts
 * with the camera at the resting INTRO_Z_END so that <Scene> sizes the
 * parked layout against the correct viewport (useThree().viewport reads
 * the current camera Z). On mount we snap the camera in to INTRO_Z_START
 * and then ease position.z back out to INTRO_Z_END over INTRO_DURATION_S
 * using ease-out-quart. After the dolly completes it stops touching the
 * camera so the existing scroll/cursor logic (which reads camera.position.z
 * to project anchors and the cursor onto the z=0 plane) takes over normally.
 *
 * Honors prefers-reduced-motion: leaves the camera at the resting position
 * with no animation.
 */
function IntroDolly() {
  const { camera } = useThree();
  const startTime = useRef<number | null>(null);
  const completed = useRef(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Camera is already at INTRO_Z_END from the Canvas default.
      completed.current = true;
      return;
    }
    camera.position.z = INTRO_Z_START;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((state) => {
    if (completed.current) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTime.current;
    const t = Math.min(1, elapsed / INTRO_DURATION_S);
    const eased = 1 - Math.pow(1 - t, 4);
    camera.position.z = INTRO_Z_START + (INTRO_Z_END - INTRO_Z_START) * eased;
    if (t >= 1) {
      camera.position.z = INTRO_Z_END;
      completed.current = true;
    }
  });

  return null;
}
