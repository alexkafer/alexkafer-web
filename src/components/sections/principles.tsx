"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Section, SectionInner } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Principle = {
  title: string;
  body: string;
};

const PRINCIPLES: Principle[] = [
  {
    title: "Reliability is product.",
    body: "Users feel uptime more than features. Build for the 99.9th percentile and the 50th takes care of itself.",
  },
  {
    title: "Velocity compounds.",
    body: "A week shaved per release becomes a quarter saved per year. Optimize the loop, not just the launch.",
  },
  {
    title: "Show, don't tell.",
    body: "Decisions land when they're rooted in real data. Telemetry > opinion.",
  },
];

const SPRING = { stiffness: 180, damping: 18, mass: 0.6 };

function PrincipleCard({
  index,
  principle,
  reduced,
}: {
  index: number;
  principle: Principle;
  reduced: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const rxRaw = useTransform(py, (v) => v * -6);
  const ryRaw = useTransform(px, (v) => v * 6);
  const rx: MotionValue<number> = useSpring(rxRaw, SPRING);
  const ry: MotionValue<number> = useSpring(ryRaw, SPRING);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    px.set(nx * 2);
    py.set(ny * 2);
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        reduced
          ? undefined
          : { rotateX: rx, rotateY: ry, transformPerspective: 800 }
      }
      className="relative rounded-md border border-mute-700/40 bg-gradient-to-br from-void-800 to-void-700 p-8 [transform-style:preserve-3d]"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-amber">
        PRINCIPLE 0{index + 1}
      </span>
      <h3 className="mt-4 text-2xl font-semibold text-cyan">
        {principle.title}
      </h3>
      <p className="mt-4 text-base text-mute-100">{principle.body}</p>
    </motion.div>
  );
}

export function PrinciplesSection() {
  const reduced = useReducedMotion();

  return (
    <Section id="principles" aria-label="Principles">
      <SectionInner>
        <p className="font-mono text-xs uppercase tracking-widest text-amber">
          {"// 09 · PRINCIPLES"}
        </p>
        <h2 className="mt-4 text-4xl font-semibold text-mute-100 md:text-5xl">
          How I work.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRINCIPLES.map((p, idx) => (
            <PrincipleCard
              key={p.title}
              principle={p}
              index={idx}
              reduced={reduced}
            />
          ))}
        </div>
      </SectionInner>
    </Section>
  );
}

export default PrinciplesSection;
