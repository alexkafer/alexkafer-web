"use client";

import { motion } from "framer-motion";
import { Section, SectionInner } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Pillar = {
  id: string;
  label: string;
  caption: string;
};

const PILLARS: Pillar[] = [
  {
    id: "multi-team",
    label: "// MULTI-TEAM",
    caption: "Many partner teams on a shared platform.",
  },
  {
    id: "user-reach",
    label: "// USER REACH",
    caption: "Users in every region.",
  },
  {
    id: "service-mesh",
    label: "// SERVICE MESH",
    caption: "Many microservices, one playbook.",
  },
  {
    id: "throughput",
    label: "// HIGH THROUGHPUT",
    caption: "Sustained load, gracefully handled.",
  },
];

export function ScaleSection() {
  const reduced = useReducedMotion();

  return (
    <Section id="scale" aria-label="Scale" className="bg-void">
      <SectionInner>
        <div className="relative">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber">
            {"// 03 · SCALE"}
          </div>
          <h2 className="mt-6 max-w-4xl font-sans text-5xl font-bold tracking-tight text-mute-100 md:text-6xl lg:text-7xl">
            Built for many teams. Built for many users.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-mute-300">
            Platform services that compound — every onboarded team, every new
            device, every additional region makes the next one cheaper to add.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div
                key={p.id}
                className="rounded-md border border-mute-700/40 bg-void-800/40 p-6 backdrop-blur-sm"
              >
                <div className="flex h-20 items-center justify-center">
                  <PillarVisual id={p.id} reduced={reduced} />
                </div>
                <div className="mt-6 font-mono text-sm uppercase tracking-wider text-cyan">
                  {p.label}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mute-300">
                  {p.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionInner>
    </Section>
  );
}

function PillarVisual({ id, reduced }: { id: string; reduced: boolean }) {
  switch (id) {
    case "multi-team":
      return <MultiTeamViz />;
    case "user-reach":
      return <UserReachViz reduced={reduced} />;
    case "service-mesh":
      return <ServiceMeshViz />;
    case "throughput":
      return <ThroughputViz reduced={reduced} />;
    default:
      return null;
  }
}

function MultiTeamViz() {
  // Fan-in: 4 small filled circles on the left converging via lines into one larger circle on the right.
  const sources = [
    { x: 12, y: 12 },
    { x: 12, y: 30 },
    { x: 12, y: 50 },
    { x: 12, y: 68 },
  ];
  const target = { x: 110, y: 40 };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 130 80"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {sources.map((s, i) => (
        <line
          key={`l-${i}`}
          x1={s.x}
          y1={s.y}
          x2={target.x}
          y2={target.y}
          stroke="#7dd3fc"
          strokeOpacity="0.45"
          strokeWidth="0.75"
        />
      ))}
      {sources.map((s, i) => (
        <circle key={`s-${i}`} cx={s.x} cy={s.y} r="3.5" fill="#7dd3fc" fillOpacity="0.85" />
      ))}
      <circle
        cx={target.x}
        cy={target.y}
        r="9"
        fill="#7dd3fc"
        className="[filter:drop-shadow(0_0_6px_rgba(125,211,252,0.55))]"
      />
    </svg>
  );
}

function UserReachViz({ reduced }: { reduced: boolean }) {
  const center = { x: 65, y: 40 };
  const rings = [0, 1, 2];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 130 80"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx={center.x} cy={center.y} r="3" fill="#7dd3fc" />
      {rings.map((i) => {
        if (reduced) {
          return (
            <circle
              key={i}
              cx={center.x}
              cy={center.y}
              r={10 + i * 10}
              fill="none"
              stroke="#7dd3fc"
              strokeOpacity={0.5 - i * 0.12}
              strokeWidth="0.75"
            />
          );
        }
        return (
          <motion.circle
            key={i}
            cx={center.x}
            cy={center.y}
            r={8}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="0.75"
            initial={{ r: 4, opacity: 0.55 }}
            animate={{ r: 32, opacity: 0 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 1,
            }}
          />
        );
      })}
    </svg>
  );
}

function ServiceMeshViz() {
  // Deterministic node positions and edges.
  const nodes = [
    { x: 18, y: 18 },
    { x: 50, y: 12 },
    { x: 90, y: 22 },
    { x: 22, y: 50 },
    { x: 64, y: 44 },
    { x: 108, y: 50 },
    { x: 40, y: 70 },
    { x: 88, y: 72 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 4],
    [2, 5],
    [3, 4],
    [4, 5],
    [3, 6],
    [4, 7],
    [6, 7],
    [5, 7],
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 130 80"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {edges.map(([a, b], i) => (
        <line
          key={`e-${i}`}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="#7dd3fc"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={`n-${i}`} cx={n.x} cy={n.y} r="2.5" fill="#7dd3fc" fillOpacity="0.9" />
      ))}
    </svg>
  );
}

function ThroughputViz({ reduced }: { reduced: boolean }) {
  // Sine waveform across the viewBox; phase animates.
  const width = 130;
  const height = 80;
  const midY = height / 2;
  const amp = 16;
  const k = (2 * Math.PI) / 40;

  function buildWave(phase: number): string {
    const points: string[] = [];
    for (let x = 0; x <= width; x += 2) {
      const y = midY + amp * Math.sin(k * x + phase);
      points.push(`${x === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }

  const staticD = buildWave(0);

  if (reduced) {
    return (
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={staticD}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const phases = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  const waves = phases.map((p) => buildWave(p));

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <motion.path
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="1.25"
        strokeLinecap="round"
        className="[filter:drop-shadow(0_0_4px_rgba(125,211,252,0.45))]"
        initial={{ d: waves[0] }}
        animate={{ d: waves }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </svg>
  );
}

export default ScaleSection;
