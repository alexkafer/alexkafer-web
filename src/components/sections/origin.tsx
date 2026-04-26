"use client";

import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function Starfield() {
  // Deterministic pseudo-random stars so SSR/CSR match.
  const stars = Array.from({ length: 60 }, (_, i) => {
    const x = (i * 97) % 100;
    const y = (i * 53) % 100;
    const r = ((i * 17) % 3) * 0.4 + 0.4;
    const o = (((i * 31) % 7) + 1) / 14;
    return { x, y, r, o, key: i };
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {stars.map((s) => (
        <circle
          key={s.key}
          cx={s.x}
          cy={s.y}
          r={s.r * 0.15}
          fill="#7dd3fc"
          opacity={s.o}
        />
      ))}
      {/* Faint orbital arc */}
      <path
        d="M -10 80 Q 50 10 110 80"
        stroke="#7dd3fc"
        strokeOpacity="0.12"
        strokeWidth="0.2"
        fill="none"
      />
      <path
        d="M -10 95 Q 50 40 110 95"
        stroke="#fbbf24"
        strokeOpacity="0.06"
        strokeWidth="0.15"
        fill="none"
      />
    </svg>
  );
}

export function OriginSection() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  // Map progress 0.1→0.6 onto bar fill 0→1
  const fill = useTransform(progress, [0.1, 0.6], [0, 1]);
  const beforeWidth = useTransform(fill, (f) =>
    reduced ? "100%" : `${f * 100}%`,
  );
  // After bar is ~12% of full
  const afterWidth = useTransform(fill, (f) =>
    reduced ? "12%" : `${f * 12}%`,
  );

  return (
    <Section id="origin" aria-label="Origin">
      <div ref={ref} className="relative">
        <Starfield />
        <SectionInner className="relative">
          <p id="origin-marker" className="ml-9 font-mono text-xs uppercase tracking-widest text-amber">
            {"// 08 · ORIGIN"}
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold text-mute-100 md:text-5xl">
            Before Xbox, NASA.
          </h2>
          <p className="mt-6 max-w-2xl text-base text-mute-300">
            At Johnson Space Center, built an NLP tool that semantically grouped
            program directives — collapsing requirement triage from a
            multi-month effort to a few days.
          </p>

          <div className="mt-14 flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-widest text-mute-500">
                MANUAL TRIAGE
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-void-800/60">
                <motion.div
                  className="h-full bg-mute-700"
                  style={{ width: beforeWidth }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-widest text-cyan [text-shadow:0_0_8px_rgba(125,211,252,0.6)]">
                WITH NLP
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-void-800/60">
                <motion.div
                  className="h-full bg-cyan shadow-glow"
                  style={{ width: afterWidth }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <p className="mt-12 font-mono text-xs uppercase tracking-widest text-mute-500">
            JOHNSON SPACE CENTER · HOUSTON, TX · 2018–2019
          </p>
        </SectionInner>
      </div>
    </Section>
  );
}

export default OriginSection;
