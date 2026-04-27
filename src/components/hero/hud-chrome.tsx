"use client";

import { useActiveSectionIndex } from "./scroll-state";
import { LABS } from "@/labs";
import { ThemeToggle } from "@/components/chrome/theme-toggle";

export function HudChrome() {
  const activeIdx = useActiveSectionIndex();
  const section = LABS[activeIdx] ?? LABS[0];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-cyan/10 bg-void/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan/70 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-amber">●</span>
        <span>NOMINAL</span>
        <span className="text-cyan/30">|</span>
        <span>LATENCY: GREEN</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-cyan">
          {section.version} · {section.title}
        </span>
        <span className="text-cyan/30">|</span>
        <span>ALEX KAFER</span>
        <span className="text-cyan/30">|</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

export default HudChrome;
