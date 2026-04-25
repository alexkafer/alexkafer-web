"use client";

import { Html } from "@react-three/drei";
import { useState } from "react";
import type { HeroNode } from "./use-hero-nodes";

const REGIONS = ["westus2", "eastus", "sea"] as const;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function metaFor(id: string, index: number) {
  const seed = 7919 + index * 131;
  const rand = lcg(seed);
  const region = REGIONS[Math.floor(rand() * REGIONS.length)];
  const p99 = 12 + Math.floor(rand() * 76);
  const rps = (1.2 + rand() * 8.6).toFixed(1);
  return { id, region, p99, rps };
}

export function NodeTooltips({ nodes }: { nodes: HeroNode[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <group>
      {nodes.map((node, i) => {
        const meta = metaFor(node.id, i);
        const isOpen = hovered === i;
        return (
          <group key={node.id} position={node.base}>
            {/* Invisible larger hit-target — covers orbit + cursor-gravity envelope */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(i);
              }}
              onPointerOut={() => setHovered((h) => (h === i ? null : h))}
            >
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {isOpen && (
              <Html
                position={[0, 0.25, 0]}
                center
                distanceFactor={8}
                zIndexRange={[40, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="rounded border border-cyan/30 bg-void-700/90 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan/90 backdrop-blur-sm shadow-glow">
                  <div>svc-id: {meta.id}</div>
                  <div>region: {meta.region}</div>
                  <div>p99: {meta.p99}ms</div>
                  <div>req/s: {meta.rps}k</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
