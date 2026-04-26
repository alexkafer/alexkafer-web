import { useMemo } from "react";

export type HeroNode = {
  id: string;
  base: [number, number, number];
  lissajous: { a: number; b: number; c: number; phaseX: number; phaseY: number; phaseZ: number; speed: number };
};

export type HeroNodeConfig = {
  count: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
  seed?: number;
};

// Simple seedable LCG so node positions are deterministic across SSR/client.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const HERO_DEFAULT_NODE_COUNT = 14;

export function buildHeroNodes(config: HeroNodeConfig): HeroNode[] {
  const { count, spreadX, spreadY, spreadZ, seed = 1337 } = config;
  const rand = lcg(seed);
  const nodes: HeroNode[] = [];
  for (let i = 0; i < count; i++) {
    // Gently bias points toward the rim so the constellation frames (rather than crowds) the centered title.
    const angle = rand() * Math.PI * 2;
    const radial = 0.45 + rand() * 0.55; // 0.45..1.0 — leaves a soft hole in the middle
    const x = Math.cos(angle) * radial * spreadX;
    const y = Math.sin(angle) * radial * spreadY;
    const z = (rand() * 2 - 1) * spreadZ;

    // Wobble amplitude scales with spread so movement reads at every viewport size.
    const ampScale = Math.min(spreadX, spreadY);
    nodes.push({
      id: `xpf-edge-${String(i + 1).padStart(2, "0")}`,
      base: [x, y, z],
      lissajous: {
        a: (0.04 + rand() * 0.05) * ampScale,
        b: (0.04 + rand() * 0.05) * ampScale,
        c: (0.05 + rand() * 0.08) * Math.max(spreadZ, 0.6),
        phaseX: rand() * Math.PI * 2,
        phaseY: rand() * Math.PI * 2,
        phaseZ: rand() * Math.PI * 2,
        speed: 0.22 + rand() * 0.3,
      },
    });
  }
  return nodes;
}

export function useHeroNodes(config: HeroNodeConfig): HeroNode[] {
  // Round to avoid rebuilding on micro-resize jitter.
  const sxKey = Math.round(config.spreadX * 10);
  const syKey = Math.round(config.spreadY * 10);
  const szKey = Math.round(config.spreadZ * 10);
  return useMemo(
    () => buildHeroNodes(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.count, sxKey, syKey, szKey, config.seed],
  );
}
