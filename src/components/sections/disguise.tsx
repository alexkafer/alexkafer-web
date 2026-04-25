"use client";

import { useRef } from "react";
import clsx from "clsx";
import { motion, useTransform } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function DisguiseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref as React.RefObject<HTMLElement>);
  const reduced = useReducedMotion();

  const opacity = useTransform(progress, [0, 0.25, 0.6, 1], [0, 1, 1, 0.85]);
  const y = useTransform(progress, [0, 0.3], [40, 0]);

  return (
    <Section id="disguise" aria-label="The Disguise">
      <div ref={ref} className="relative flex min-h-screen w-full items-center justify-center">
          <SectionInner className="relative z-10 flex min-h-screen items-center">
            <motion.div
              style={reduced ? undefined : { opacity, y }}
              className="max-w-4xl"
            >
              <div
                className={clsx(
                  "mb-8 font-mono text-xs uppercase tracking-[0.3em] text-mute-300",
                )}
              >
                {"// 02 · THE DISGUISE"}
              </div>
              <h2 className="font-sans font-bold tracking-tight">
                <span className="block text-5xl text-mute-100 md:text-6xl lg:text-7xl">
                  PM by title.
                </span>
                <span className="mt-2 block text-5xl text-cyan md:text-6xl lg:text-7xl">
                  Systems engineer by instinct.
                </span>
              </h2>
              <p className="mt-8 max-w-2xl text-base text-mute-300">
                Five years building secure, reliable platform services. The
                product decisions are downstream of the systems thinking.
              </p>
            </motion.div>
          </SectionInner>
        </div>
    </Section>
  );
}

export default DisguiseSection;
