"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, SectionInner } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { EXPERIMENT_ID, type StatsRow } from "@/lib/ab";
import { useABExperiment } from "@/lib/ab-context";
import { VARIANT_CTAS, type Variant } from "@/lib/cta-variants";

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  if (diff < 2000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function smoothScrollUp() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function VariantPreviewCard({
  variant,
  isAssigned,
  converted,
}: {
  variant: Variant;
  isAssigned: boolean;
  converted: boolean;
}) {
  const cta = VARIANT_CTAS[variant];
  const Icon = cta.Icon;

  const base =
    "relative flex flex-col items-start gap-3 rounded-md border p-5 transition-colors";
  const tone = isAssigned
    ? "border-cyan/50 bg-cyan/10 text-cyan"
    : "border-mute-700/60 bg-void-800 text-mute-300";

  return (
    <div className={`${base} ${tone}`}>
      <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className={isAssigned ? "text-amber" : "text-mute-500"}>
          Variant {variant}
        </span>
        <div className="flex items-center gap-1.5">
          {isAssigned && <span className="text-amber">you</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-base font-semibold">
        <span className={isAssigned ? "text-cyan" : "text-mute-200"}>
          <Icon />
        </span>
        <span className={isAssigned ? "text-cyan" : "text-mute-200"}>
          {cta.label}
        </span>
        {isAssigned && converted && <span className="text-amber">✓</span>}
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-mute-500">
        {cta.hint}
      </div>
    </div>
  );
}

function Scorecard({
  rows,
  generatedAt,
  assigned,
}: {
  rows: StatsRow[];
  generatedAt: string | null;
  assigned: Variant | null;
}) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const map = new Map<Variant, StatsRow>();
  rows.forEach((r) => map.set(r.variant, r));
  const variants: Variant[] = ["A", "B"];

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-mute-700/40 bg-void-800 p-6 text-center font-mono text-sm text-mute-300">
        No data yet. You&apos;ll be the first.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-mute-700/40">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Live A/B test results for experiment {EXPERIMENT_ID}
        </caption>
        <thead className="bg-void-800">
          <tr className="font-mono text-[10px] uppercase tracking-widest text-mute-500">
            <th scope="col" className="px-4 py-2">Variant</th>
            <th scope="col" className="px-4 py-2 text-right">Impressions</th>
            <th scope="col" className="px-4 py-2 text-right">Conversions</th>
            <th scope="col" className="px-4 py-2 text-right">Conv. Rate</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const row = map.get(v);
            const isAssigned = assigned === v;
            return (
              <tr
                key={v}
                className="border-t border-mute-700/40 font-mono text-sm"
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-mono text-base font-bold text-mute-100"
                >
                  {v}
                  {isAssigned && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-amber">
                      you
                    </span>
                  )}
                </th>
                <td className="px-4 py-3 text-right text-mute-100">
                  {row?.impressions ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-mute-100">
                  {row?.conversions ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-mute-100">
                  {row?.conversion_rate_pct === null ||
                  row?.conversion_rate_pct === undefined
                    ? "—"
                    : `${row.conversion_rate_pct.toFixed(2)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bg-void-800 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-mute-500">
        Last updated: {relativeTime(generatedAt)}
      </div>
    </div>
  );
}

export function ABTestSection() {
  const reduced = useReducedMotion();
  const { sessionId, assigned, converted, stats, error, reroll } = useABExperiment();

  const query = stats?.query ?? "-- loading…";

  return (
    <Section id="lab" aria-label="Live A/B test">
      <SectionInner>
        <p id="lab-marker" className="ml-9 font-mono text-xs uppercase tracking-widest text-amber">
          {"// 10 · LAB"}
        </p>
        <h2 className="mt-4 text-4xl font-semibold text-mute-100 md:text-5xl">
          Show, don&apos;t tell. A live A/B test.
        </h2>
        <p className="mt-6 max-w-2xl text-base text-mute-300">
          The secondary CTA in the hero is the experiment. Your session was
          randomly assigned to one variant. Clicking that button records a
          conversion. The query and scorecard below run against a real SQL
          database — every visitor&apos;s data is in here.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left column: experiment */}
          <div>
            <div className="space-y-1 font-mono text-xs uppercase tracking-widest text-mute-500">
              <div>EXPERIMENT: <span className="text-mute-100">{EXPERIMENT_ID}</span></div>
              <div>YOUR SESSION: <span className="text-mute-100">{shortId(sessionId)}</span></div>
              <div>
                ASSIGNED VARIANT:{" "}
                <span className="text-cyan">{assigned ?? "…"}</span>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <VariantPreviewCard
                variant="A"
                isAssigned={assigned === "A"}
                converted={converted}
              />
              <VariantPreviewCard
                variant="B"
                isAssigned={assigned === "B"}
                converted={converted}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={smoothScrollUp}
                className="font-mono text-xs uppercase tracking-widest text-cyan underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded-sm"
              >
                ↑ scroll up to convert
              </button>
              <button
                type="button"
                onClick={reroll}
                className="font-mono text-xs uppercase tracking-widest text-mute-500 underline-offset-4 hover:text-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded-sm"
              >
                ↻ Reroll session
              </button>
              <AnimatePresence>
                {converted && (
                  <motion.span
                    key="converted"
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    className="font-mono text-xs uppercase tracking-widest text-cyan"
                  >
                    ✓ conversion logged
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right column: data */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-amber">
              LIVE QUERY ↓
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-cyan/30 bg-void-900 p-4 font-mono text-xs text-mute-100">
              <code>{query}</code>
            </pre>

            <p className="mt-6 font-mono text-xs uppercase tracking-widest text-amber">
              RESULTS ↓
            </p>
            <div className="mt-2">
              <Scorecard
                rows={stats?.rows ?? []}
                generatedAt={stats?.generatedAt ?? null}
                assigned={assigned}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-8 font-mono text-xs text-red-400">
            {`// fetch error: ${error}`}
          </p>
        )}
      </SectionInner>
    </Section>
  );
}

export default ABTestSection;
