"use client";

import { useMemo, useRef } from "react";
import clsx from "clsx";
import { motion, useTransform } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Line = { x1: number; y1: number; x2: number; y2: number };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLines(count: number, seed = 1337): Line[] {
  const rand = mulberry32(seed);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count + 4; i++) {
    points.push({ x: rand() * 100, y: rand() * 100 });
  }
  const lines: Line[] = [];
  for (let i = 0; i < count; i++) {
    const a = points[Math.floor(rand() * points.length)];
    const b = points[Math.floor(rand() * points.length)];
    if (a === b) continue;
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return lines;
}

export function DisguiseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref as React.RefObject<HTMLElement>);
  const reduced = useReducedMotion();

  const opacity = useTransform(progress, [0, 0.25, 0.6, 1], [0, 1, 1, 0.85]);
  const y = useTransform(progress, [0, 0.3], [40, 0]);
  const overlayOpacity = useTransform(progress, [0.1, 0.6], [0.1, 0.4]);

  const lines = useMemo(() => generateLines(20), []);

  return (
    <Section id="disguise" aria-label="The Disguise">
      <div ref={ref} className="relative flex min-h-screen w-full items-center justify-center">
          {/* x-ray overlay */}
          {reduced ? null : (
            <motion.svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ opacity: overlayOpacity }}
            >
              {lines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="#7dd3fc"
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </motion.svg>
          )}

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
