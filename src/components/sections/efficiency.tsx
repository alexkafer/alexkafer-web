"use client";

import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

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

const COST_W = 520;
const COST_H = 200;
const COST_PAD_L = 28;
const COST_PAD_R = 96;
const COST_PAD_T = 16;
const COST_PAD_B = 28;

function buildCurve(steepness: number): { d: string; length: number } {
  const x0 = COST_PAD_L;
  const x1 = COST_W - COST_PAD_R;
  const y0 = COST_H - COST_PAD_B;
  const yTop = COST_PAD_T;
  const span = x1 - x0;
  const points: Array<[number, number]> = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + t * span;
    const eased = Math.pow(t, 1 + steepness);
    const y = y0 - eased * (y0 - yTop);
    points.push([x, y]);
  }
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    length += Math.hypot(x - px, y - py);
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return { d, length };
}

const BASELINE_CURVE = buildCurve(2.4);
const OPTIMIZED_CURVE = buildCurve(0.4);

export function EfficiencySection() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  return (
    <Section
      id="efficiency"
      aria-label="Efficiency: smaller bill, same reliability"
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
            Smaller bill. Same reliability.
          </h2>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mute-300">
            Drove resource-utilization projects that reduced cloud spend without
            compromising performance.
          </p>

          <CostChart progress={progress} reduced={reduced} />

          <Chart progress={progress} reduced={reduced} />

          <p className="font-mono text-xs uppercase tracking-widest text-mute-500">
            {"// platform efficiency compounds."}
          </p>
        </div>
      </SectionInner>
    </Section>
  );
}

function CostChart({
  progress,
  reduced,
}: {
  progress: ReturnType<typeof useScrollProgress>;
  reduced: boolean;
}) {
  const baselineOffset = useTransform(
    progress,
    [0, 1],
    [BASELINE_CURVE.length, 0],
  );
  const optimizedOffset = useTransform(
    progress,
    [0, 1],
    [OPTIMIZED_CURVE.length, 0],
  );
  const pathLength = useTransform(progress, [0, 1], [0, 1]);

  const x0 = COST_PAD_L;
  const x1 = COST_W - COST_PAD_R;
  const y0 = COST_H - COST_PAD_B;
  const yTop = COST_PAD_T;

  return (
    <svg
      role="img"
      aria-label="Two-line chart showing baseline cost rising steeply versus optimized cost rising gently"
      viewBox={`0 0 ${COST_W} ${COST_H}`}
      className="h-auto w-full max-w-[520px]"
    >
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y0}
        className="stroke-mute-700/60"
        strokeWidth="1"
      />
      <line
        x1={x0}
        y1={yTop}
        x2={x0}
        y2={y0}
        className="stroke-mute-700/60"
        strokeWidth="1"
      />
      <text
        x={x1}
        y={y0 + 18}
        textAnchor="end"
        className="fill-mute-500 font-mono"
        fontSize="10"
        style={{ letterSpacing: "0.15em" }}
      >
        TIME →
      </text>
      <text
        x={x0 - 6}
        y={yTop + 4}
        textAnchor="end"
        className="fill-mute-500 font-mono"
        fontSize="10"
        style={{ letterSpacing: "0.15em" }}
      >
        COST
      </text>

      {reduced ? (
        <path
          d={BASELINE_CURVE.d}
          fill="none"
          className="stroke-mute-500"
          strokeWidth="1.75"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      ) : (
        <motion.path
          d={BASELINE_CURVE.d}
          fill="none"
          className="stroke-mute-500"
          strokeWidth="1.75"
          strokeDasharray="4 4"
          strokeLinecap="round"
          style={{
            pathLength,
            strokeDashoffset: baselineOffset,
          }}
        />
      )}

      {reduced ? (
        <path
          d={OPTIMIZED_CURVE.d}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="2.25"
          strokeLinecap="round"
          className="shadow-glow [filter:drop-shadow(0_0_6px_rgba(125,211,252,0.55))]"
        />
      ) : (
        <motion.path
          d={OPTIMIZED_CURVE.d}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="2.25"
          strokeLinecap="round"
          className="shadow-glow [filter:drop-shadow(0_0_6px_rgba(125,211,252,0.55))]"
          style={{
            pathLength,
            strokeDashoffset: optimizedOffset,
          }}
        />
      )}

      <text
        x={x1 + 8}
        y={yTop + 6}
        className="fill-mute-500 font-mono"
        fontSize="10"
        style={{ letterSpacing: "0.15em" }}
      >
        BASELINE
      </text>
      <text
        x={x1 + 8}
        y={y0 - (y0 - yTop) * Math.pow(1, 1 + 0.4) + 6}
        className="fill-cyan font-mono"
        fontSize="10"
        style={{ letterSpacing: "0.15em" }}
      >
        OPTIMIZED
      </text>
    </svg>
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
