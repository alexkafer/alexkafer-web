"use client";

import Link from "next/link";
import { useActiveSectionIndex } from "./scroll-state";
import { LABS } from "@/labs";
import { ThemeToggle } from "@/components/chrome/theme-toggle";

export function HudChrome() {
  const activeIdx = useActiveSectionIndex();
  const section = LABS[activeIdx] ?? LABS[0];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-cyan/10 bg-void/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan/70 backdrop-blur-sm">
      <Link
        href="/status"
        aria-label="View systems status"
        className="pointer-events-auto group flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-cyan/5 hover:text-cyan focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan/60"
      >
        <span className="text-amber transition-transform group-hover:scale-125">●</span>
        <span>NOMINAL</span>
      </Link>
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
