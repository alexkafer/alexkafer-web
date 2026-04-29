"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useABExperiment } from "@/lib/ab-context";
import { VARIANT_CTAS } from "@/lib/cta-variants";

function smoothScrollTo(selector: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HeroCtaRow() {
  const reduced = useReducedMotion();
  const { assigned, converted, recordConversion } = useABExperiment();
  const learnRef = useRef<HTMLButtonElement | null>(null);

  // Set the keyboard tab flow's starting point on the Learn With Me CTA so
  // a user pressing Tab/Shift+Tab lands on the hero's primary action first.
  // Conditions guard against stealing focus from someone who:
  //   - already focused something else (e.g., the address bar autocompleted
  //     into the page),
  //   - landed on a deep link (URL has a hash),
  //   - prefers reduced motion (the focus jump can be disorienting).
  // Done in useEffect rather than autoFocus so it never runs during SSR.
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    if (window.scrollY > 0) return;
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement
    ) {
      return;
    }
    // Defer slightly so the layout settles before we focus — avoids the
    // browser scrolling the button into view on top of the hero copy.
    const id = window.setTimeout(() => {
      learnRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(id);
  }, [reduced]);

  const cta = assigned ? VARIANT_CTAS[assigned] : null;
  const Icon = cta?.Icon;

  const onSecondaryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cta || !assigned) {
      e.preventDefault();
      return;
    }
    // Fire-and-forget; opening happens via the anchor's default behavior in a new tab.
    void recordConversion();
  };

  return (
    <motion.div
      className="pointer-events-auto mt-10 flex flex-col items-center gap-4"
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          ref={learnRef}
          type="button"
          onClick={() => smoothScrollTo("#about")}
          className="group inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-void transition-colors hover:bg-cyan/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
        >
          <span>Learn With Me</span>
          <span aria-hidden className="transition-transform group-hover:translate-y-0.5">↓</span>
        </button>

        <a
          href={cta?.href ?? "#lab"}
          target={cta ? "_blank" : undefined}
          rel={cta ? "noreferrer noopener" : undefined}
          onClick={onSecondaryClick}
          aria-label={cta ? `${cta.label} (variant ${assigned}${converted ? ", conversion recorded" : ""})` : "Loading variant"}
          className="group relative inline-flex items-center justify-center gap-2 rounded-md border border-cyan/40 bg-void/80 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan backdrop-blur-md transition-colors hover:bg-void/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
        >
          <span
            aria-hidden
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded bg-amber font-mono text-[10px] font-bold uppercase tracking-normal text-void"
            title="A/B test variant"
          >
            {assigned ?? "…"}
          </span>
          {Icon && <Icon />}
          <span>{cta?.label ?? "Loading…"}</span>
          {converted && <span aria-hidden className="text-amber">✓</span>}
        </a>
      </div>
    </motion.div>
  );
}

export default HeroCtaRow;
