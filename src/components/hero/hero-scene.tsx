"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HERO_DEFAULT_NODE_COUNT } from "./use-hero-nodes";
import { LAYOUTS, SECTIONS, type LayoutFn } from "./section-layouts";
import { getScrollState } from "./scroll-state";

const NODE_COLOR = "#7dd3fc";
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

function ConstellationNodes({
  nodes,
  cursor,
  spread,
  nodeSize,
  cursorRadius,
  cursorStrength,
  positionsRef,
  reduced,
}: {
  nodes: LiveNode[];
  cursor: React.MutableRefObject<CursorState>;
  spread: { x: number; y: number; z: number };
  nodeSize: number;
  cursorRadius: number;
  cursorStrength: number;
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  reduced: boolean;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useRef<THREE.Vector3[]>(nodes.map(() => new THREE.Vector3()));
  const projected = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const { camera } = useThree();

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
    const active = SECTIONS[sc.activeIndex] ?? SECTIONS[0];
    const next = SECTIONS[sc.nextIndex] ?? active;
    const layoutA: LayoutFn = LAYOUTS[active.layout];
    const layoutB: LayoutFn = LAYOUTS[next.layout];

    if (cursor.current.active) {
      projected.current.set(cursor.current.x, cursor.current.y, 0.5);
      projected.current.unproject(camera);
      const dir = projected.current.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      projected.current.copy(camera.position).add(dir.multiplyScalar(distance));
    }

    nodes.forEach((node, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;

      // Blend the two section layouts to find this frame's target base.
      const aArr = layoutA(i, nodes.length, spread);
      const bArr = layoutB(i, nodes.length, spread);
      node.a.set(aArr[0], aArr[1], aArr[2]);
      node.b.set(bArr[0], bArr[1], bArr[2]);
      node.a.lerp(node.b, sc.blend);

      if (reduced) {
        node.base.copy(node.a);
      } else {
        node.base.lerp(node.a, BASE_LERP);
      }

      // Lissajous wobble adds life on top of the morphed base. Damp it during
      // active morph so the transition reads as deliberate.
      const wobbleScale = reduced ? 0 : 1 - sc.blend * 0.5;
      const { ampX, ampY, ampZ, phaseX, phaseY, phaseZ, speed } = node.liss;
      const ox = Math.sin(t * speed + phaseX) * ampX * wobbleScale;
      const oy = Math.sin(t * speed * 1.3 + phaseY) * ampY * wobbleScale;
      const oz = Math.sin(t * speed * 0.9 + phaseZ) * ampZ * wobbleScale;
      const baseX = node.base.x + ox;
      const baseY = node.base.y + oy;
      const baseZ = node.base.z + oz;

      // Cursor gravity (unchanged).
      const target = tmp.current.set(0, 0, 0);
      if (cursor.current.active && !reduced) {
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
            emissiveIntensity={0.6}
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
        // Linear falloff with a generous base so lines read clearly. Lines
        // beyond the cutoff fade to 0; nearby lines stay close to full
        // opacity so the constellation feels connected.
        const visible = Math.max(0, 1 - dist / cutoff);
        obj.material.opacity = 0.55 * visible;
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
        spread={{ x: spreadX, y: spreadY, z: spreadZ }}
        nodeSize={nodeSize}
        cursorRadius={cursorRadius}
        cursorStrength={cursorStrength}
        positionsRef={positionsRef}
        reduced={reduced}
      />
      <ConstellationLinks
        nodes={nodes}
        positionsRef={positionsRef}
        linkDistance={linkDistance}
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
