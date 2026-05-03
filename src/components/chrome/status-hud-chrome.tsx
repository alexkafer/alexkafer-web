"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/chrome/theme-toggle";

export function StatusHudChrome() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-cyan/10 bg-void/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan/70 backdrop-blur-sm">
      <Link
        href="/"
        aria-label="Return to home"
        className="group pointer-events-auto flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-cyan/5 hover:text-cyan focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan/60"
      >
        <span className="transition-transform group-hover:-translate-x-0.5">←</span>
        <span>RETURN TO BRIDGE</span>
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-cyan">MISSION CONTROL</span>
        <span className="text-cyan/30">|</span>
        <span>ALEX KAFER</span>
        <span className="text-cyan/30">|</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

export default StatusHudChrome;
