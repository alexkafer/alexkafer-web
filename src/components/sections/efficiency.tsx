"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useTransform, useInView } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const TARGET = 2_200_000;
const PROJECTS = [
  { code: "OPT-01", weight: 0.85 },
  { code: "OPT-02", weight: 0.55 },
  { code: "OPT-03", weight: 1.0 },
  { code: "OPT-04", weight: 0.4 },
  { code: "OPT-05", weight: 0.7 },
];
const CHART_W = 480;
const CHART_H = 180;
const BAR_GAP = 16;
const BAR_W = (CHART_W - BAR_GAP * (PROJECTS.length - 1)) / PROJECTS.length;

function formatUSD(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function EfficiencySection() {
  const ref = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  const inView = useInView(counterRef, { amount: 0.4, once: true });
  const [counter, setCounter] = useState(reduced ? TARGET : 0);

  useEffect(() => {
    if (reduced) {
      setCounter(TARGET);
      return;
    }
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setCounter(Math.round(TARGET * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  return (
    <Section
      id="efficiency"
      aria-label="Efficiency: $2.2M saved annually across five resource-utilization projects"
    >
      <SectionInner className="flex min-h-screen flex-col justify-center gap-12">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="space-y-12"
        >
          <p className="font-mono text-sm uppercase tracking-widest text-amber">
            {"// 06 · EFFICIENCY"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            $2.2M saved annually.
          </h2>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mute-300">
            Identified and executed five resource-utilization projects that
            reduced cloud spend without compromising performance.
          </p>

          <div ref={counterRef} className="py-4">
            <div
              className="font-mono text-5xl text-cyan shadow-glow md:text-6xl [text-shadow:0_0_18px_rgba(125,211,252,0.55)]"
              aria-label={`Annual savings: ${formatUSD(TARGET)}`}
            >
              {formatUSD(counter)}
            </div>
          </div>

          <Chart progress={progress} reduced={reduced} />

          <p className="font-mono text-xs uppercase tracking-widest text-mute-500">
            {"// 5 projects · 12 threat-model + privacy reviews · platform efficiency compounds."}
          </p>
        </div>
      </SectionInner>
    </Section>
  );
}

function Chart({
  progress,
  reduced,
}: {
  progress: ReturnType<typeof useScrollProgress>;
  reduced: boolean;
}) {
  return (
    <svg
      role="img"
      aria-label="Bar chart of five resource-utilization projects"
      viewBox={`0 0 ${CHART_W} ${CHART_H + 28}`}
      className="h-auto w-full max-w-[480px]"
    >
      {PROJECTS.map((p, i) => {
        const targetH = CHART_H * p.weight;
        const x = i * (BAR_W + BAR_GAP);
        return (
          <BarItem
            key={p.code}
            x={x}
            barW={BAR_W}
            chartH={CHART_H}
            targetH={targetH}
            code={p.code}
            progress={progress}
            reduced={reduced}
          />
        );
      })}
    </svg>
  );
}

function BarItem({
  x,
  barW,
  chartH,
  targetH,
  code,
  progress,
  reduced,
}: {
  x: number;
  barW: number;
  chartH: number;
  targetH: number;
  code: string;
  progress: ReturnType<typeof useScrollProgress>;
  reduced: boolean;
}) {
  const h = useTransform(progress, [0, 1], [0, targetH]);
  const y = useTransform(h, (v) => chartH - v);

  return (
    <g>
      {reduced ? (
        <rect
          x={x}
          y={chartH - targetH}
          width={barW}
          height={targetH}
          rx="2"
          className="fill-cyan/80"
        />
      ) : (
        <motion.rect
          x={x}
          y={y}
          width={barW}
          height={h}
          rx="2"
          className="fill-cyan/80"
        />
      )}
      <text
        x={x + barW / 2}
        y={chartH + 18}
        textAnchor="middle"
        className="fill-mute-300 font-mono"
        fontSize="11"
      >
        {code}
      </text>
    </g>
  );
}

export default EfficiencySection;
