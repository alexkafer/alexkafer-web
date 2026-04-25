"use client";

import { useEffect, useState } from "react";

const REGIONS = ["us-west-2", "us-east-1", "ap-southeast-1", "eu-central-1", "ap-northeast-1"] as const;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

type PillItem =
  | { region: string; kind: "p99"; p99: number }
  | { region: string; kind: "q"; qdepth: number };

const SEQUENCE: PillItem[] = (() => {
  const rand = lcg(424242);
  return Array.from({ length: 32 }, () => {
    const region = REGIONS[Math.floor(rand() * REGIONS.length)];
    const useP99 = rand() < 0.5;
    if (useP99) {
      return { region, kind: "p99" as const, p99: 12 + Math.floor(rand() * 76) };
    }
    return { region, kind: "q" as const, qdepth: 1 + Math.floor(rand() * 24) };
  });
})();

export function StatusPill() {
  const [i, setI] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => setI((n) => (n + 1) % SEQUENCE.length), 1500);
    return () => window.clearInterval(id);
  }, []);

  const item = SEQUENCE[i];
  return (
    <div
      aria-hidden={!mounted}
      className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-full border border-cyan/30 bg-void-700/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan/80 backdrop-blur-sm"
    >
      <span className="text-amber">●</span>{" "}
      <span>{item.region}</span>
      <span className="text-cyan/30"> · </span>
      {item.kind === "p99" ? (
        <span>p99 {item.p99}ms</span>
      ) : (
        <span>q-depth {item.qdepth}</span>
      )}
      <span className="text-cyan/30"> · </span>
      <span>OK</span>
    </div>
  );
}

export default StatusPill;
