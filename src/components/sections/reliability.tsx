"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useTransform, useMotionValueEvent } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const GAUGE_SIZE = 200;
const GAUGE_STROKE = 14;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_RADIUS;
const TARGET_PCT = 99.9;

const TILE_COLS = 20;
const TILE_ROWS = 10;
const TILE_COUNT = TILE_COLS * TILE_ROWS;

export function ReliabilitySection() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  const dashOffset = useTransform(
    progress,
    [0, 1],
    [GAUGE_CIRC, GAUGE_CIRC * (1 - TARGET_PCT / 100)],
  );

  const [pct, setPct] = useState(reduced ? TARGET_PCT : 0);
  const [litTiles, setLitTiles] = useState(reduced ? TILE_COUNT : 0);

  useMotionValueEvent(progress, "change", (v) => {
    if (reduced) return;
    setPct(Math.min(TARGET_PCT, v * TARGET_PCT));
    setLitTiles(Math.round(v * TILE_COUNT));
  });

  useEffect(() => {
    if (reduced) {
      setPct(TARGET_PCT);
      setLitTiles(TILE_COUNT);
    }
  }, [reduced]);

  return (
    <Section
      id="reliability"
      aria-label="Reliability: 99.9% availability across 100k+ Azure resources"
    >
      <SectionInner className="flex min-h-screen flex-col justify-center gap-12">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="space-y-12"
        >
          <p className="font-mono text-sm uppercase tracking-widest text-amber">
            {"// 05 · RELIABILITY"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            99.9% availability. Zero incidents.
          </h2>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mute-300">
            Coordinated multistage infrastructure migrations on 100k+ Azure
            resources without a single user-impacting incident.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative"
                style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
              >
                <svg
                  width={GAUGE_SIZE}
                  height={GAUGE_SIZE}
                  viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
                  role="img"
                  aria-label={`Availability gauge at ${pct.toFixed(1)} percent`}
                  style={{ transform: "rotate(-90deg)" }}
                >
                  <circle
                    cx={GAUGE_SIZE / 2}
                    cy={GAUGE_SIZE / 2}
                    r={GAUGE_RADIUS}
                    className="stroke-mute-700/40"
                    strokeWidth={GAUGE_STROKE}
                    fill="none"
                  />
                  {reduced ? (
                    <circle
                      cx={GAUGE_SIZE / 2}
                      cy={GAUGE_SIZE / 2}
                      r={GAUGE_RADIUS}
                      stroke="#7dd3fc"
                      strokeWidth={GAUGE_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={GAUGE_CIRC}
                      strokeDashoffset={GAUGE_CIRC * (1 - TARGET_PCT / 100)}
                    />
                  ) : (
                    <motion.circle
                      cx={GAUGE_SIZE / 2}
                      cy={GAUGE_SIZE / 2}
                      r={GAUGE_RADIUS}
                      stroke="#7dd3fc"
                      strokeWidth={GAUGE_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={GAUGE_CIRC}
                      style={{ strokeDashoffset: dashOffset }}
                    />
                  )}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-3xl text-cyan shadow-glow [text-shadow:0_0_12px_rgba(125,211,252,0.6)]">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-mute-500">
                availability
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 lg:items-start">
              <div
                role="img"
                aria-label={`${litTiles} of ${TILE_COUNT} tiles lit, representing 100k+ Azure resources`}
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${TILE_COLS}, minmax(0, 1fr))`,
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                {Array.from({ length: TILE_COUNT }).map((_, i) => {
                  const lit = i < litTiles;
                  return (
                    <span
                      key={i}
                      className={
                        "aspect-square rounded-[1px] transition-colors duration-150 " +
                        (lit ? "bg-cyan/80 shadow-[0_0_4px_rgba(125,211,252,0.6)]" : "bg-mute-700")
                      }
                    />
                  );
                })}
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-mute-500">
                100k+ resources · zero incidents
              </p>
            </div>
          </div>
        </div>
      </SectionInner>
    </Section>
  );
}

export default ReliabilitySection;
