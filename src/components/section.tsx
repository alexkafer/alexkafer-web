"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { useScroll, type MotionValue } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

type SectionProps = {
  id?: string;
  className?: string;
  pin?: boolean;
  children: ReactNode;
  "aria-label"?: string;
};

export function useScrollProgress(
  ref: React.RefObject<HTMLElement>,
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return scrollYProgress;
}

export function Section({
  id,
  className,
  pin = false,
  children,
  "aria-label": ariaLabel,
}: SectionProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!pin) return;
      if (typeof window === "undefined") return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReduced) return;
      if (!ref.current) return;

      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        pinSpacing: true,
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: ref, dependencies: [pin] },
  );

  return (
    <section
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      className={clsx("relative min-h-screen w-full", className)}
    >
      {children}
    </section>
  );
}

export function SectionInner({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("mx-auto max-w-6xl px-6 py-24 md:px-10", className)}>
      {children}
    </div>
  );
}

export default Section;
