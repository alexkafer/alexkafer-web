"use client";

import { useEffect, useState } from "react";

const REGIONS = ["westus2", "eastus", "sea", "weu", "jpe"] as const;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const SEQUENCE = (() => {
  const rand = lcg(424242);
  return Array.from({ length: 32 }, () => ({
    region: REGIONS[Math.floor(rand() * REGIONS.length)],
    rps: (1.2 + rand() * 8.6).toFixed(1),
    p99: 12 + Math.floor(rand() * 76),
  }));
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
      <span>{item.rps}k req/s</span>
      <span className="text-cyan/30"> · </span>
      <span>p99 {item.p99}ms</span>
    </div>
  );
}

export default StatusPill;
