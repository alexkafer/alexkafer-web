"use client";

import { useEffect, useRef, useState } from "react";
import {
  heroInteraction,
  HOVER_HOLD_MS,
  type InteractiveStar,
} from "./hero-interaction-state";

// DOM overlay that sits over the (pointer-events-none) Three.js canvas and
// handles all hover/click interaction for the section-anchor stars. The
// scene exposes per-frame screen positions via heroInteraction; we render
// one transparent <a> hit zone at each visible star, position the orbiting
// ring + section tooltip on hover, and let the browser handle navigation
// via the anchor (so middle-click / cmd-click / keyboard focus all work).
//
// The 1s hover-hold gate before showing the section name is implemented
// here too: hovering immediately starts the orbit ring, but the tooltip
// (and the corresponding star color override in the scene) doesn't fire
// until HOVER_HOLD_MS has elapsed.
const HIT_PX = 44;

export function HeroHoverOverlay() {
  // We re-render every animation frame so screen positions track the camera.
  // The map of interactive stars is small (one per non-hero section), so
  // this stays cheap.
  const [, force] = useState(0);
  const rafRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const tick = () => {
      if (!mountedRef.current) return;
      force((n) => (n + 1) & 0xffff);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stars = Array.from(heroInteraction.getInteractiveStars().values());
  const hover = heroInteraction.getHover();
  const now = performance.now();

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-0 z-30"
    >
      {stars.map((star) => {
        const pos = heroInteraction.getScreenPos(star.starIdx);
        if (!pos || !pos.visible) return null;
        const isHovered = hover?.starIdx === star.starIdx;
        const elapsed = isHovered ? now - hover.startedAt : 0;
        const showLabel = isHovered && elapsed >= HOVER_HOLD_MS;
        return (
          <StarHitZone
            key={star.starIdx}
            star={star}
            x={pos.x}
            y={pos.y}
            showLabel={showLabel}
          />
        );
      })}
    </div>
  );
}

function StarHitZone({
  star,
  x,
  y,
  showLabel,
}: {
  star: InteractiveStar;
  x: number;
  y: number;
  showLabel: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <a
        href={`#${star.slug}`}
        aria-label={`Jump to ${star.title}`}
        onMouseEnter={() =>
          heroInteraction.setHover({
            starIdx: star.starIdx,
            startedAt: performance.now(),
          })
        }
        onMouseLeave={() => heroInteraction.setHover(null)}
        onFocus={() =>
          heroInteraction.setHover({
            starIdx: star.starIdx,
            startedAt: performance.now(),
          })
        }
        onBlur={() => heroInteraction.setHover(null)}
        onClick={(e) => {
          // Smooth-scroll to the section's marker so the destination matches
          // the visual anchor point exactly. Fall back to the section
          // container if the marker isn't in the DOM (e.g. lazy section).
          const target =
            document.getElementById(`${star.slug}-marker`) ??
            document.getElementById(star.slug);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", `#${star.slug}`);
          }
          heroInteraction.setHover(null);
        }}
        className="pointer-events-auto block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
        style={{
          width: HIT_PX,
          height: HIT_PX,
          // Center the hit zone on the star regardless of HIT_PX.
          marginLeft: -HIT_PX / 2,
          marginTop: -HIT_PX / 2,
        }}
      >
        <span className="sr-only">{star.title}</span>
      </a>

      {/* Orbiting comet trail is drawn in 3D as part of the constellation
          scene (see HoverOrbit in hero-scene.tsx) so it inherits the same
          wobble/distortion as the star itself. */}

      {/* Tooltip — opacity-gates so it fades in instead of pops at HOLD_MS. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-full mt-4 whitespace-nowrap rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mute-100 backdrop-blur transition-all duration-200"
        style={{
          transform: `translate(-50%, ${showLabel ? "0" : "-4px"})`,
          opacity: showLabel ? 1 : 0,
          borderColor: `${star.color}66`,
          backgroundColor: "rgb(var(--color-void-800) / 0.78)",
          boxShadow: `0 4px 18px -6px ${star.color}55`,
        }}
      >
        {star.title}
      </span>
    </div>
  );
}

export default HeroHoverOverlay;
