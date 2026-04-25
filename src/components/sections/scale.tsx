"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { animate, useInView } from "framer-motion";
import { Section, SectionInner } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Stat = {
  id: string;
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
  from?: number;
  duration?: number;
  label: string;
  display: string;
};

const STATS: Stat[] = [
  {
    id: "teams",
    from: 1,
    to: 9,
    duration: 1,
    format: (v) => Math.round(v).toString(),
    label: "partner teams onboarded",
    display: "1 → 9",
  },
  {
    id: "mau",
    to: 100,
    duration: 1.6,
    format: (v) => `${Math.round(v).toLocaleString()}M`,
    label: "monthly active users",
    display: "100M",
  },
  {
    id: "services",
    to: 100,
    duration: 1.6,
    format: (v) => `${Math.round(v).toLocaleString()}+`,
    label: "microservices managed",
    display: "100+",
  },
  {
    id: "requests",
    to: 8.2,
    decimals: 1,
    duration: 1.8,
    format: (v) => `${v.toFixed(1)}B`,
    label: "requests handled per day",
    display: "8.2B",
  },
];

function Counter({ stat, active }: { stat: Stat; active: boolean }) {
  const reduced = useReducedMotion();
  const [text, setText] = useState<string>(() => {
    if (reduced) return stat.format ? stat.format(stat.to) : String(stat.to);
    if (stat.id === "teams") return "1";
    return stat.format ? stat.format(0) : "0";
  });

  useEffect(() => {
    if (reduced) {
      setText(stat.format ? stat.format(stat.to) : String(stat.to));
      return;
    }
    if (!active) return;
    const from = stat.from ?? 0;
    const controls = animate(from, stat.to, {
      duration: stat.duration ?? 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        setText(stat.format ? stat.format(v) : String(Math.round(v)));
      },
    });
    return () => controls.stop();
  }, [active, reduced, stat]);

  return (
    <span className="font-mono text-6xl font-medium text-cyan shadow-glow [text-shadow:0_0_18px_rgba(125,211,252,0.45)]">
      {text}
    </span>
  );
}

type FlowPath = { d: string; dur: number; delay: number };

function generateFlowPaths(): FlowPath[] {
  // 6 deterministic curves traversing the card grid horizontally.
  const base = [
    "M 5,30 C 25,10 45,50 65,30 S 95,20 110,40",
    "M 5,55 C 30,75 55,35 80,60 S 100,75 115,55",
    "M 5,75 C 28,55 52,90 78,70 S 102,50 115,80",
    "M 0,40 C 20,60 40,20 60,45 S 90,65 115,35",
    "M 0,65 C 22,40 48,80 72,55 S 96,30 115,70",
    "M 0,20 C 18,45 42,10 68,38 S 92,58 115,25",
  ];
  return base.map((d, i) => ({ d, dur: 4 + i * 0.6, delay: i * 0.4 }));
}

export function ScaleSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const flows = useMemo(generateFlowPaths, []);

  return (
    <Section id="scale" aria-label="Scale" className="bg-void">
      <SectionInner>
        <div ref={ref} className="relative">
          <div
            className={clsx(
              "font-mono text-xs uppercase tracking-[0.3em] text-amber",
            )}
          >
            {"// 03 · SCALE"}
          </div>
          <h2 className="mt-6 max-w-4xl font-sans text-5xl font-bold tracking-tight text-mute-100 md:text-6xl lg:text-7xl">
            Operating at billions per day.
          </h2>

          <div className="relative mt-12">
            {!reduced && (
              <svg
                aria-hidden="true"
                viewBox="0 0 115 90"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
              >
                <defs>
                  {flows.map((f, i) => (
                    <path key={`p-${i}`} id={`flow-${i}`} d={f.d} fill="none" />
                  ))}
                </defs>
                {flows.map((f, i) => (
                  <g key={`g-${i}`}>
                    <use
                      href={`#flow-${i}`}
                      stroke="#7dd3fc"
                      strokeOpacity={0.08}
                      strokeWidth={0.3}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle r={0.6} fill="#7dd3fc">
                      <animateMotion
                        dur={`${f.dur}s`}
                        begin={`${f.delay}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href={`#flow-${i}`} />
                      </animateMotion>
                    </circle>
                  </g>
                ))}
              </svg>
            )}

            <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.id}
                  className={clsx(
                    "rounded-md border border-mute-700/40 bg-void-800/40 p-6 backdrop-blur-sm",
                  )}
                >
                  <div className="leading-none">
                    <Counter stat={stat} active={inView} />
                  </div>
                  <div className="mt-6 font-mono text-sm uppercase tracking-wider text-mute-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionInner>
    </Section>
  );
}

export default ScaleSection;
