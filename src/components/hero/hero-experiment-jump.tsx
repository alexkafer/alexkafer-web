"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useABExperiment } from "@/lib/ab-context";

function smoothScrollTo(selector: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// "See the experiment" jump pill at the bottom of the hero. Extracted from
// HeroCopy so it can be mounted AFTER the constellation hit zones in DOM
// order — that way the keyboard tab flow runs:
//   Learn With Me → Variant CTA → 4 constellation stars → see-experiment
// instead of skipping the stars entirely.
export function HeroExperimentJump() {
  const reduced = useReducedMotion();
  const { assigned, assignedRate } = useABExperiment();

  const variantBadge = (
    <span
      aria-hidden
      className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-amber px-1 font-mono text-[10px] font-bold uppercase tracking-normal text-void align-middle"
    >
      {assigned ?? "…"}
    </span>
  );

  const rateContent = (() => {
    if (!assigned)
      return (
        <span>{"// live · calibrating live experiment… · see the experiment ↓"}</span>
      );
    if (assignedRate == null) {
      return (
        <span className="inline-flex items-center gap-1">
          <span>{"// live · Variant"}</span>
          {variantBadge}
          <span>{"awaiting first conversion · see the experiment ↓"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1">
        <span>{"// live · Variant"}</span>
        {variantBadge}
        <span>{`converting at ${assignedRate.toFixed(1)}% · see the experiment ↓`}</span>
      </span>
    );
  })();

  return (
    <motion.div
      // Position over the bottom of the hero viewport. The hero <section>
      // is `h-screen`, so absolute-bottom hugs the bottom edge regardless
      // of the constellation overlays sitting on top.
      className="pointer-events-none absolute inset-x-0 bottom-10 z-30 flex justify-center"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.8 }}
    >
      <button
        type="button"
        onClick={() => smoothScrollTo("#lab")}
        className="pointer-events-auto group inline-flex items-center gap-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60 transition-colors hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan/70"
        />
        {rateContent}
      </button>
    </motion.div>
  );
}

export default HeroExperimentJump;
