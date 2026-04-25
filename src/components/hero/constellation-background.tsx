"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { SECTIONS } from "./section-layouts";
import { setScrollState } from "./scroll-state";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

// Tracks scroll position relative to each registered section and updates the
// shared scroll state. The Three.js scene reads from that state every frame.
function ScrollDriver() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    let ticking = false;

    const computeAndSet = () => {
      ticking = false;
      const elements = SECTIONS.map((s) => document.getElementById(s.id));
      const vh = window.innerHeight;
      const center = window.scrollY + vh / 2;

      let activeIndex = 0;
      let progress = 0;

      // Walk sections; locate the one containing the viewport center.
      let placed = false;
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (center >= top && center < top + height) {
          activeIndex = i;
          progress = (center - top) / Math.max(height, 1);
          placed = true;
          break;
        }
        if (center < top) {
          // Above this section -> we belong to the previous one (or this if
          // it's the first).
          activeIndex = Math.max(0, i - 1);
          const cur = elements[activeIndex];
          if (cur) {
            progress = Math.min(
              1,
              Math.max(0, (center - cur.offsetTop) / Math.max(cur.offsetHeight, 1)),
            );
          }
          placed = true;
          break;
        }
      }
      if (!placed) {
        activeIndex = elements.length - 1;
        progress = 1;
      }

      progress = Math.min(1, Math.max(0, progress));
      const nextIndex = Math.min(SECTIONS.length - 1, activeIndex + 1);
      // Hold the section's layout for the first half, then morph toward the
      // next layout in the second half. This gives each section a settled
      // "framed" beat before the constellation reorganizes.
      const blend = progress < 0.5 ? 0 : (progress - 0.5) * 2;

      setScrollState({ activeIndex, nextIndex, progress, blend });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = window.requestAnimationFrame(computeAndSet);
    };

    computeAndSet();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}

export function ConstellationBackground() {
  return (
    <>
      <ScrollDriver />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
      >
        <HeroScene />
      </div>
      {/* Soft vignette over the scene so section copy stays readable. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(5,5,16,0) 0%, rgba(5,5,16,0.55) 60%, rgba(5,5,16,0.92) 100%)",
        }}
      />
    </>
  );
}

export default ConstellationBackground;
