"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
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

const NODE_COLOR = "#7dd3fc";
const NODE_COLOR_VEC = new THREE.Color(NODE_COLOR);
const ACTIVE_SCALE = 1.4;
const ACTIVE_EMISSIVE = 1.0;
const BASE_EMISSIVE = 0.6;
const STAR_COUNT = 1500;
const STAR_RADIUS = 30;
const DAMPING = 0.05;
const BASE_LERP = 0.08;

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
    const activeStarIdx = inSectionView
      ? assignment.sectionToStar.get(sc.activeIndex)
      : undefined;
    const activeMeta = inSectionView ? LABS[sc.activeIndex] : undefined;
    const activeAnchorPos =
      inSectionView && activeMeta
        ? getAnchorWorldPos(activeMeta.slug, camera, gl.domElement)
        : null;

    if (cursor.current.active) {
      projected.current.set(cursor.current.x, cursor.current.y, 0.5);
      projected.current.unproject(camera);
      dirTmp.current.copy(projected.current).sub(camera.position).normalize();
      const distance = -camera.position.z / dirTmp.current.z;
      projected.current.copy(camera.position).add(dirTmp.current.multiplyScalar(distance));
    }

    const cloudFn = LAYOUTS.cloud;
    const parkedFn = LAYOUTS.parked;

    nodes.forEach((node, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;

      const cArr = cloudFn(i, nodes.length, spread);
      const pArr = parkedFn(i, nodes.length, spread);
      cloudTarget.current.set(cArr[0], cArr[1], cArr[2]);
      parkedTarget.current.set(pArr[0], pArr[1], pArr[2]);
      blendedTarget.current.copy(parkedTarget.current).lerp(cloudTarget.current, heroBlend);

      // Active section star: override base target with DOM anchor when present.
      const isActiveStar = i === activeStarIdx;
      if (isActiveStar && activeAnchorPos) {
        node.a.copy(activeAnchorPos);
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
      // Active star wobbles less so it sits cleanly beside the marker.
      const wobbleAtten = isActiveStar && activeAnchorPos ? 0.15 : 1;
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
      const targetScale = isActiveStar && activeAnchorPos ? ACTIVE_SCALE : 1;
      mesh.scale.lerp(
        tmp.current.set(targetScale, targetScale, targetScale),
        0.15,
      );

      // Color: blend cloud color → parked color by (1 - heroBlend).
      const mat = mesh.material as THREE.MeshStandardMaterial;
      colorTmp.current.copy(NODE_COLOR_VEC).lerp(parkedColors[i], 1 - heroBlend);
      mat.color.copy(colorTmp.current);
      mat.emissive.copy(colorTmp.current);
      mat.emissiveIntensity =
        isActiveStar && activeAnchorPos ? ACTIVE_EMISSIVE : BASE_EMISSIVE;
      mat.transparent = true;
      mat.opacity = 1;
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
  linkDistance,
}: {
  nodes: LiveNode[];
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  linkDistance: number;
}) {
  // Build a generous candidate pair list: pairs that are close enough in ANY
  // of the layouts. Lines fade by current distance per frame so long lines
  // disappear gracefully during morph.
  const pairs = useMemo(() => {
    const layouts = Object.values(LAYOUTS);
    const synth = { x: 4, y: 3, z: 1 };
    const pos: [number, number, number][][] = layouts.map((fn) =>
      nodes.map((_, i) => fn(i, nodes.length, synth)),
    );
    const out: Array<[number, number]> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        for (let k = 0; k < layouts.length; k++) {
          const a = pos[k][i];
          const b = pos[k][j];
          const dx = a[0] - b[0];
          const dy = a[1] - b[1];
          const dz = a[2] - b[2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 1.4) {
            out.push([i, j]);
            break;
          }
        }
      }
    }
    return out;
  }, [nodes]);

  const lineRefs = useRef<(THREE.Object3D | null)[]>([]);
  const segBuffer = useRef<Float32Array>(new Float32Array(6));

  useFrame(() => {
    const sc = getScrollState().current;
    const heroBlend =
      sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const cutoff = linkDistance;

    pairs.forEach(([i, j], k) => {
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
        const visible = Math.max(0, 1 - dist / cutoff);
        obj.material.transparent = true;
        obj.material.opacity = 0.55 * visible * heroBlend;
      }
    });
  });

  return (
    <group>
      {pairs.map(([i, j], k) => (
        <Line
          key={`${i}-${j}`}
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

  useFrame(() => {
    const sc = getScrollState().current;
    const heroBlend = sc.activeIndex === 0 ? 1 - sc.blend : 0;
    const sectionFade = 1 - heroBlend; // 0 in hero, 1 in section view

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
        obj.material.opacity = isActive ? 0.45 * sectionFade : 0;
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
  const nodeCount = isCompact ? 16 : isPortrait ? 20 : HERO_DEFAULT_NODE_COUNT;

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

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 4, 6]} intensity={0.6} color="#7dd3fc" />
      <PointerTracker cursor={cursor} />
      <Starfield />
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
        linkDistance={linkDistance}
      />
      <SectionLinks
        positionsRef={positionsRef}
        assignment={assignment}
        neighborPairs={neighborPairs}
        parkedColors={parkedColors}
      />
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
