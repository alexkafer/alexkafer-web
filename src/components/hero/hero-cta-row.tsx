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
  const { assigned, converted, recordConversion } = useABExperiment();

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
