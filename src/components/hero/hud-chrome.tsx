"use client";

import { useEffect, useState } from "react";
import { useActiveSectionIndex } from "./scroll-state";
import { LABS } from "@/labs";

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function HudChrome() {
  const [elapsed, setElapsed] = useState(0);
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA || "dev";
  const activeIdx = useActiveSectionIndex();
  const section = LABS[activeIdx] ?? LABS[0];

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - start);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-cyan/10 bg-void/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan/70 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-amber">●</span>
        <span>NOMINAL</span>
        <span className="text-cyan/30">|</span>
        <span>SYS: NOMINAL</span>
        <span className="text-cyan/30">|</span>
        <span>LATENCY: GREEN</span>
        <span className="text-cyan/30">|</span>
        <span>COVERAGE: GLOBAL</span>
        <span className="text-cyan/30">|</span>
        <span>T+ {fmtElapsed(elapsed)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-cyan">
          cloud · {section.version} · {section.title}
        </span>
        <span className="text-cyan/30">|</span>
        <span>BUILD {sha}</span>
      </div>
    </div>
  );
}

export default HudChrome;
