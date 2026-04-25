import { useMemo } from "react";

export type HeroNode = {
  id: string;
  base: [number, number, number];
  lissajous: { a: number; b: number; c: number; phaseX: number; phaseY: number; phaseZ: number; speed: number };
};

// Simple seedable LCG so node positions are deterministic across SSR/client.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const HERO_NODE_COUNT = 12;
export const HERO_LINK_DISTANCE = 1.4;

export function buildHeroNodes(seed = 1337): HeroNode[] {
  const rand = lcg(seed);
  const nodes: HeroNode[] = [];
  for (let i = 0; i < HERO_NODE_COUNT; i++) {
    const x = (rand() * 2 - 1) * 3;
    const y = (rand() * 2 - 1) * 1.5;
    const z = (rand() * 2 - 1) * 1;
    nodes.push({
      id: `xpf-edge-${String(i + 1).padStart(2, "0")}`,
      base: [x, y, z],
      lissajous: {
        a: 0.15 + rand() * 0.25,
        b: 0.1 + rand() * 0.2,
        c: 0.08 + rand() * 0.15,
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        phaseZ: rand() * Math.PI * 2,
        speed: 0.25 + rand() * 0.35,
      },
    });
  }
  return nodes;
}

export function useHeroNodes(seed = 1337): HeroNode[] {
  return useMemo(() => buildHeroNodes(seed), [seed]);
}
