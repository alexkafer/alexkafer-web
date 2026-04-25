"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HERO_DEFAULT_NODE_COUNT, useHeroNodes, type HeroNode } from "./use-hero-nodes";
import { NodeTooltips } from "./node-tooltips";

const NODE_COLOR = "#7dd3fc";
const STAR_COUNT = 1500;
const STAR_RADIUS = 30;
const DAMPING = 0.05;

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
      // uniform-ish in sphere via rejection
      let x = 0,
        y = 0,
        z = 0,
        len = 2;
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

function ConstellationNodes({
  nodes,
  cursor,
  nodeSize,
  cursorRadius,
  cursorStrength,
  onPositionsUpdate,
}: {
  nodes: HeroNode[];
  cursor: React.MutableRefObject<CursorState>;
  nodeSize: number;
  cursorRadius: number;
  cursorStrength: number;
  onPositionsUpdate?: (positions: THREE.Vector3[]) => void;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useRef<THREE.Vector3[]>(nodes.map(() => new THREE.Vector3()));
  const projected = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const positions = useRef<THREE.Vector3[]>(nodes.map(() => new THREE.Vector3()));
  const { camera, viewport } = useThree();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Project cursor NDC -> world plane at z=0
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
      const { a, b, c, phaseX, phaseY, phaseZ, speed } = node.lissajous;
      const ox = Math.sin(t * speed + phaseX) * a;
      const oy = Math.sin(t * speed * 1.3 + phaseY) * b;
      const oz = Math.sin(t * speed * 0.9 + phaseZ) * c;
      const baseX = node.base[0] + ox;
      const baseY = node.base[1] + oy;
      const baseZ = node.base[2] + oz;

      // cursor gravity
      const target = tmp.current.set(0, 0, 0);
      if (cursor.current.active) {
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
      positions.current[i].copy(mesh.position);
    });

    if (onPositionsUpdate) onPositionsUpdate(positions.current);
    // Avoid unused warning
    void delta;
    void viewport;
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
  nodes: HeroNode[];
  positionsRef: React.MutableRefObject<THREE.Vector3[]>;
  linkDistance: number;
}) {
  // Build static pairs based on base positions; lines will visually approximate as positions move slightly.
  const pairs = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].base[0] - nodes[j].base[0];
        const dy = nodes[i].base[1] - nodes[j].base[1];
        const dz = nodes[i].base[2] - nodes[j].base[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < linkDistance) out.push([i, j]);
      }
    }
    return out;
  }, [nodes, linkDistance]);

  const lineRefs = useRef<(THREE.Object3D | null)[]>([]);
  const segBuffer = useRef<Float32Array>(new Float32Array(6));

  useFrame(() => {
    pairs.forEach(([i, j], k) => {
      // drei's <Line> wraps three-stdlib's Line2 / LineGeometry, which stores
      // positions in interleaved instanceStart/instanceEnd buffers — NOT in the
      // standard `geometry.attributes.position`. The proper way to mutate them
      // each frame is the LineGeometry.setPositions() helper.
      const obj = lineRefs.current[k] as unknown as {
        geometry?: { setPositions?: (arr: ArrayLike<number>) => void };
      } | null;
      if (!obj?.geometry?.setPositions) return;
      const a = positionsRef.current[i];
      const b = positionsRef.current[j];
      const buf = segBuffer.current;
      buf[0] = a.x; buf[1] = a.y; buf[2] = a.z;
      buf[3] = b.x; buf[4] = b.y; buf[5] = b.z;
      obj.geometry.setPositions(buf);
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
          points={[
            [nodes[i].base[0], nodes[i].base[1], nodes[i].base[2]],
            [nodes[j].base[0], nodes[j].base[1], nodes[j].base[2]],
          ]}
          color={NODE_COLOR}
          opacity={0.15}
          transparent
          lineWidth={1}
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
  // Compute spread to fill ~88% of the visible canvas at the constellation's z=0 plane.
  // Camera at z=8 fov=55 => visible vertical ≈ 8.33 world units; horizontal scales with aspect.
  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;
  const spreadX = halfW * 0.88;
  const spreadY = halfH * 0.78;
  const spreadZ = Math.min(spreadX, spreadY) * 0.35;
  const minDim = Math.min(spreadX, spreadY);

  const isPortrait = viewport.width < viewport.height;
  const isCompact = viewport.width < 6;
  const nodeCount = isCompact ? 16 : isPortrait ? 20 : HERO_DEFAULT_NODE_COUNT;

  const nodes = useHeroNodes({
    count: nodeCount,
    spreadX,
    spreadY,
    spreadZ,
    seed: 1337,
  });

  // Visual constants scale with the smaller half-dimension so things read at every size.
  const nodeSize = Math.max(0.06, minDim * 0.025);
  const linkDistance = minDim * 0.7;
  const cursorRadius = minDim * 0.55;
  const cursorStrength = 0.6;

  const cursor = useRef<CursorState>({ x: 0, y: 0, active: false });
  const positionsRef = useRef<THREE.Vector3[]>([]);
  // Keep positions array in sync with current node count (avoids stale refs after a resize-driven rebuild).
  if (positionsRef.current.length !== nodes.length) {
    positionsRef.current = nodes.map(() => new THREE.Vector3());
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 4, 6]} intensity={0.6} color="#7dd3fc" />
      <PointerTracker cursor={cursor} />
      <Starfield />
      <ConstellationNodes
        nodes={nodes}
        cursor={cursor}
        nodeSize={nodeSize}
        cursorRadius={cursorRadius}
        cursorStrength={cursorStrength}
        onPositionsUpdate={(p) => {
          for (let i = 0; i < p.length; i++) positionsRef.current[i].copy(p[i]);
        }}
      />
      <ConstellationLinks nodes={nodes} positionsRef={positionsRef} linkDistance={linkDistance} />
      <NodeTooltips nodes={nodes} hitRadius={Math.max(0.4, minDim * 0.18)} htmlOffset={Math.max(0.25, nodeSize * 3)} />
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
