"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeroCtaRow } from "./hero-cta-row";
import { useABExperiment } from "@/lib/ab-context";

function smoothScrollTo(selector: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HeroCopy() {
  const prefersReduced = useReducedMotion();
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
    if (!assigned) return <span>{"// live · calibrating live experiment… · see the experiment ↓"}</span>;
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

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReduced ? 0 : 0.08, delayChildren: prefersReduced ? 0 : 0.1 },
    },
  };
  const line = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: prefersReduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <div className="pointer-events-none relative z-20 flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <motion.div initial="hidden" animate="visible" variants={container} className="flex flex-col items-center">
        <motion.div
          variants={line}
          className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
        >
          {"// IDENTIFIED CONTACT"}
        </motion.div>
        <h1 className="flex flex-col items-center gap-2">
          <motion.span
            variants={line}
            className="font-sans text-6xl font-semibold tracking-tight text-mute-100 sm:text-7xl md:text-8xl"
          >
            Alex Kafer
          </motion.span>
          <motion.span
            variants={line}
            className="font-sans text-lg font-light tracking-tight text-mute-300 sm:text-xl md:text-2xl"
          >
            Senior PM, Xbox Platform.
          </motion.span>
          <motion.span
            variants={line}
            className="font-sans text-lg font-light tracking-tight text-cyan sm:text-xl md:text-2xl"
          >
            Operating at platform scale.
          </motion.span>
        </h1>

        <HeroCtaRow />
      </motion.div>

      <motion.div
        className="pointer-events-auto absolute bottom-10"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.6, delay: prefersReduced ? 0 : 0.8 }}
      >
        <button
          type="button"
          onClick={() => smoothScrollTo("#lab")}
          className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60 transition-colors hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900 rounded-sm"
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan/70" />
          {rateContent}
        </button>
      </motion.div>
    </div>
  );
}

export default HeroCopy;
