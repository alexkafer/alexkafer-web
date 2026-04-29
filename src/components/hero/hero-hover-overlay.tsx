"use client";

import { useEffect, useRef, useState } from "react";
import {
  heroInteraction,
  HOVER_HOLD_MS,
  type InteractiveStar,
} from "./hero-interaction-state";

// DOM overlay that sits over the (pointer-events-none) Three.js canvas and
// handles all hover/click interaction for the section-anchor stars.
//
// Hover is detected by a single window-level pointermove listener that
// picks the *nearest* interactive star within HIT_RADIUS_PX of the cursor.
// This lets us use a generously large hover radius (~10× the visual star)
// without overlapping DOM hit-zones fighting over which one gets pointer
// events — closest always wins, even when two stars drift near each other.
//
// Each star still renders a small <a> for keyboard focus / direct clicks
// (so middle-click, cmd-click, Enter, screen readers all work). When the
// cursor is inside the hover radius but not over the small anchor, the
// window-level click handler completes the navigation.
//
// The 1s hover-hold gate (tooltip + scene color override) lives in
// HOVER_HOLD_MS.
const ANCHOR_PX = 22;
// Hover radius around each star, in screen pixels. Roughly 10× the
// rendered diameter of an interactive star (~14px), giving the user a
// forgiving target while wobbly stars drift around.
const HIT_RADIUS_PX = 140;

function navigateToSlug(slug: string) {
  const target =
    document.getElementById(`${slug}-marker`) ??
    document.getElementById(slug);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${slug}`);
  }
}

export function HeroHoverOverlay() {
  // We re-render every animation frame so screen positions track the camera.
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

  // Closest-star pointer tracking. Runs at the window level so we don't
  // need overlapping DOM hit zones — we just compute distances each
  // pointermove and update the hover state accordingly.
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      // Synthesized events from touch/click sometimes arrive at (0,0)
      // and we don't want them to trigger spurious hover.
      if (e.pointerType === "touch") return;
      const stars = Array.from(
        heroInteraction.getInteractiveStars().values(),
      );
      let bestStar: InteractiveStar | null = null;
      let bestDist = Infinity;
      for (const star of stars) {
        const pos = heroInteraction.getScreenPos(star.starIdx);
        if (!pos || !pos.visible) continue;
        const dx = pos.x - e.clientX;
        const dy = pos.y - e.clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          bestStar = star;
        }
      }
      const current = heroInteraction.getHover();
      if (bestStar && bestDist <= HIT_RADIUS_PX) {
        if (current?.starIdx !== bestStar.starIdx) {
          heroInteraction.setHover({
            starIdx: bestStar.starIdx,
            startedAt: performance.now(),
          });
        }
      } else if (current) {
        heroInteraction.setHover(null);
      }
    };

    const onPointerLeave = () => {
      if (heroInteraction.getHover()) heroInteraction.setHover(null);
    };

    // Click anywhere within the hover radius navigates — but only if the
    // click target isn't already an interactive element (anchor, button,
    // input, etc.). That way we don't hijack clicks on the HUD, CTA row,
    // or one of our own focusable star anchors (which have their own
    // onClick handler below).
    const onClick = (e: MouseEvent) => {
      const hover = heroInteraction.getHover();
      if (!hover) return;
      const target = e.target as Element | null;
      if (target?.closest("a,button,input,select,textarea,[role=button]")) {
        return;
      }
      const stars = heroInteraction.getInteractiveStars();
      const star = stars.get(hover.starIdx);
      if (!star) return;
      e.preventDefault();
      navigateToSlug(star.slug);
      heroInteraction.setHover(null);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("click", onClick);
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
        // Mouse hover detection lives in the window-level handler so the
        // closest star wins — but keyboard focus still drives the orbit
        // and tooltip state directly.
        onFocus={() =>
          heroInteraction.setHover({
            starIdx: star.starIdx,
            startedAt: performance.now(),
          })
        }
        onBlur={() => heroInteraction.setHover(null)}
        onClick={(e) => {
          e.preventDefault();
          navigateToSlug(star.slug);
          heroInteraction.setHover(null);
        }}
        className="pointer-events-auto block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
        style={{
          width: ANCHOR_PX,
          height: ANCHOR_PX,
          marginLeft: -ANCHOR_PX / 2,
          marginTop: -ANCHOR_PX / 2,
        }}
      >
        <span className="sr-only">{star.title}</span>
      </a>

      {/* Orbit ring is drawn in 3D — see HoverOrbit in hero-scene.tsx. */}

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
