"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeroCtaRow } from "./hero-cta-row";

export function HeroCopy() {
  const prefersReduced = useReducedMotion();

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
          {"Hello, my name is"}
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
            Senior Product Manager
          </motion.span>
          <motion.span
            variants={line}
            className="font-sans text-lg font-light tracking-tight text-cyan sm:text-xl md:text-2xl"
          >
            Solving Problems at Scale
          </motion.span>
        </h1>

        <HeroCtaRow />
      </motion.div>
    </div>
  );
}

export default HeroCopy;
