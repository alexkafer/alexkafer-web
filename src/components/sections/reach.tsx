"use client";

import { useEffect, useRef, useState } from "react";
import { useTransform, type MotionValue } from "framer-motion";
import { Gamepad2, Globe, Tv, Glasses } from "lucide-react";
import clsx from "clsx";
import { Section, SectionInner, useScrollProgress } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Device = {
  icon: typeof Gamepad2;
  label: string;
};

const DEVICES: Device[] = [
  { icon: Gamepad2, label: "CONSOLE" },
  { icon: Globe, label: "WEB" },
  { icon: Tv, label: "SMARTTV" },
  { icon: Glasses, label: "META QUEST" },
];

function useBooleanMotion(mv: MotionValue<boolean>): boolean {
  const [val, setVal] = useState<boolean>(() => mv.get());
  useEffect(() => {
    setVal(mv.get());
    const unsub = mv.on("change", (v) => setVal(v));
    return () => unsub();
  }, [mv]);
  return val;
}

function DeviceCard({
  device,
  index,
  progress,
  threshold,
  forceLit,
}: {
  device: Device;
  index: number;
  progress: MotionValue<number>;
  threshold: number;
  forceLit: boolean;
}) {
  const litMV = useTransform(progress, (p) => forceLit || p > threshold);
  const lit = useBooleanMotion(litMV);
  const Icon = device.icon;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-4 rounded-md border bg-void-800/30 p-8 transition-all duration-700",
        lit ? "border-cyan/60 shadow-glow" : "border-mute-700/40",
      )}
      aria-label={`${device.label} endpoint ${lit ? "active" : "pending"}`}
    >
      <Icon
        className={clsx(
          "h-12 w-12 transition-colors duration-700",
          lit ? "text-cyan" : "text-mute-700",
        )}
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <span
        className={clsx(
          "font-mono text-xs tracking-widest transition-colors duration-700",
          lit ? "text-cyan" : "text-mute-500",
        )}
      >
        {String(index + 1).padStart(2, "0")} · {device.label}
      </span>
    </div>
  );
}

export function ReachSection() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);
  const reduced = useReducedMotion();

  return (
    <Section id="reach" aria-label="Reach">
      <div ref={ref}>
        <SectionInner>
          <p id="reach-marker" className="font-mono text-xs uppercase tracking-widest text-amber">
            {"// 07 · REACH"}
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold text-mute-100 md:text-5xl">
            Xbox Remote Play, anywhere.
          </h2>
          <p className="mt-6 max-w-2xl text-base text-mute-300">
            Owned Xbox Remote Play — the experience that lets users stream their
            console from any device. Led the endpoint expansion to web,
            SmartTV, and Meta Quest.
          </p>

          <div className="mt-12 flex flex-col">
            <span className="font-mono text-xs uppercase tracking-widest text-mute-500">
              REACH
            </span>
            <span className="mt-2 font-mono text-4xl text-cyan [text-shadow:0_0_12px_rgba(125,211,252,0.6)]">
              Console-quality, anywhere.
            </span>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {DEVICES.map((device, idx) => (
              <DeviceCard
                key={device.label}
                device={device}
                index={idx}
                progress={progress}
                threshold={0.2 * idx}
                forceLit={reduced}
              />
            ))}
          </div>
        </SectionInner>
      </div>
    </Section>
  );
}

export default ReachSection;
