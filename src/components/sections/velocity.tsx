"use client";

import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BAR_WIDTH = 720;
const BAR_HEIGHT = 56;
const WEEKS_FRACTION = 0.18;

export function VelocitySection() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  const fillWidth = useTransform(
    progress,
    [0, 1],
    [BAR_WIDTH, BAR_WIDTH * WEEKS_FRACTION],
  );

  const staticFill = reduced ? BAR_WIDTH * WEEKS_FRACTION : undefined;

  return (
    <Section
      id="velocity"
      aria-label="Velocity: time-to-market reduced from months to weeks"
    >
      <SectionInner className="flex min-h-screen flex-col justify-center gap-12">
        <div ref={ref as React.RefObject<HTMLDivElement>} className="space-y-12">
          <p id="velocity-marker" className="font-mono text-sm uppercase tracking-widest text-amber">
            {"// 04 · VELOCITY"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            Time-to-market: months &rarr; weeks.
          </h2>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mute-300">
            Reduced platform onboarding from months to weeks, without
            compromising reliability.
          </p>

          <div className="space-y-3">
            <div
              className="flex items-center justify-between font-mono text-xs uppercase tracking-widest"
              style={{ maxWidth: BAR_WIDTH }}
            >
              <span className="text-mute-500">BEFORE</span>
              <span className="text-cyan">AFTER</span>
            </div>

            <svg
              role="img"
              aria-label="Bar showing time-to-market shrinking from months to weeks"
              viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT + 32}`}
              className="h-auto w-full max-w-[720px]"
            >
              <defs>
                <linearGradient
                  id="velocity-fill"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="1" />
                </linearGradient>
              </defs>

              <rect
                x="0"
                y="0"
                width={BAR_WIDTH}
                height={BAR_HEIGHT}
                rx="4"
                className="fill-void-700 stroke-mute-700/60"
                strokeWidth="1"
              />

              {reduced ? (
                <rect
                  x="0"
                  y="0"
                  width={staticFill}
                  height={BAR_HEIGHT}
                  rx="4"
                  fill="url(#velocity-fill)"
                />
              ) : (
                <motion.rect
                  x="0"
                  y="0"
                  width={fillWidth}
                  height={BAR_HEIGHT}
                  rx="4"
                  fill="url(#velocity-fill)"
                />
              )}

              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={BAR_WIDTH * t}
                  x2={BAR_WIDTH * t}
                  y1="0"
                  y2={BAR_HEIGHT}
                  stroke="#050510"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
              ))}

              <text
                x="12"
                y={BAR_HEIGHT + 22}
                className="fill-mute-500 font-mono"
                fontSize="11"
                style={{ letterSpacing: "0.15em" }}
              >
                MONTHS
              </text>
              <text
                x={BAR_WIDTH * WEEKS_FRACTION - 8}
                y={BAR_HEIGHT + 22}
                textAnchor="end"
                className="fill-cyan font-mono"
                fontSize="11"
                style={{ letterSpacing: "0.15em" }}
              >
                WEEKS
              </text>
            </svg>
          </div>
        </div>
      </SectionInner>
    </Section>
  );
}

export default VelocitySection;
