"use client";

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
  const { assigned, assignedRate, converted, recordConversion } = useABExperiment();

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

  const rateLabel = (() => {
    if (!assigned) return "calibrating live experiment…";
    if (assignedRate == null) return `you're seeing variant ${assigned} · awaiting first conversion`;
    return `variant ${assigned} converting at ${assignedRate.toFixed(1)}%`;
  })();

  return (
    <motion.div
      className="pointer-events-auto mt-10 flex flex-col items-center gap-4"
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => smoothScrollTo("#disguise")}
          className="group inline-flex items-center justify-center gap-2 rounded-md bg-cyan px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-void transition-colors hover:bg-cyan/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
        >
          <span>Explore</span>
          <span aria-hidden className="transition-transform group-hover:translate-y-0.5">↓</span>
        </button>

        <a
          href={cta?.href ?? "#lab"}
          target={cta ? "_blank" : undefined}
          rel={cta ? "noreferrer noopener" : undefined}
          onClick={onSecondaryClick}
          aria-label={cta ? `${cta.label} (variant ${assigned}${converted ? ", conversion recorded" : ""})` : "Loading variant"}
          className="group relative inline-flex items-center justify-center gap-2 rounded-md border border-cyan/40 bg-cyan/5 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan transition-colors hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900"
        >
          <span
            aria-hidden
            className="absolute -top-2 right-3 rounded-sm bg-amber px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-widest text-void"
            title="A/B test variant"
          >
            {assigned ? `Variant ${assigned}` : "…"}
          </span>
          {Icon && <Icon />}
          <span>{cta?.label ?? "Loading…"}</span>
          {converted && <span aria-hidden className="text-amber">✓</span>}
        </a>
      </div>

      <button
        type="button"
        onClick={() => smoothScrollTo("#lab")}
        className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60 transition-colors hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-900 rounded-sm"
      >
        <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan/70" />
        <span>{`// live · ${rateLabel} · see the experiment ↓`}</span>
      </button>
    </motion.div>
  );
}

export default HeroCtaRow;
