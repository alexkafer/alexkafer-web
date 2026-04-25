"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, SectionInner } from "@/components/section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { EXPERIMENT_ID, type StatsRow } from "@/lib/ab";

type Variant = "A" | "B";

type ImpressionResponse = {
  sessionId: string;
  variant: Variant;
  alreadyImpressed: boolean;
};

type StatsResponse = {
  query: string;
  rows: StatsRow[];
  generatedAt: string;
};

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `request failed (${res.status})`);
  }
  return data;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `request failed (${res.status})`);
  }
  return data;
}

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

function pickWinner(rows: StatsRow[]): Variant | null {
  const valid = rows.filter(
    (r) => r.conversion_rate_pct !== null && r.impressions > 0,
  );
  if (valid.length === 0) return null;
  const sorted = [...valid].sort(
    (a, b) => (b.conversion_rate_pct ?? 0) - (a.conversion_rate_pct ?? 0),
  );
  if (sorted.length > 1 && sorted[0].conversion_rate_pct === sorted[1].conversion_rate_pct) {
    return null;
  }
  return sorted[0].variant;
}

function VariantButton({
  variant,
  assigned,
  converted,
  pulse,
  onClick,
  disabled,
  reduced,
}: {
  variant: Variant;
  assigned: boolean;
  converted: boolean;
  pulse: boolean;
  onClick: () => void;
  disabled: boolean;
  reduced: boolean;
}) {
  const base =
    "relative flex h-32 w-full flex-col items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan";
  const enabled =
    "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/15 cursor-pointer";
  const disabledClass =
    "border-mute-700 bg-void-800 text-mute-500 cursor-not-allowed";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={`Variant ${variant}${assigned ? " — your assigned variant" : " — not your variant"}`}
      title={
        assigned
          ? "Click to record a conversion for your variant"
          : "~50% of sessions see this variant"
      }
      animate={
        !reduced && pulse
          ? { scale: [1, 1.04, 1], boxShadow: ["0 0 0 rgba(125,211,252,0)", "0 0 24px rgba(125,211,252,0.6)", "0 0 0 rgba(125,211,252,0)"] }
          : { scale: 1 }
      }
      transition={{ duration: 0.6 }}
      className={`${base} ${assigned ? enabled : disabledClass}`}
    >
      {assigned && (
        <span className="absolute right-2 top-2 rounded-sm bg-amber px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-void">
          Your variant
        </span>
      )}
      {!assigned && (
        <span className="absolute right-2 top-2 font-mono text-[10px] uppercase tracking-widest text-mute-500">
          ~50% of sessions
        </span>
      )}
      <span className="font-mono text-5xl font-bold">{variant}</span>
      <span className="mt-2 font-mono text-xs uppercase tracking-widest">
        Variant {variant}
        {converted && assigned ? " · ✓" : ""}
      </span>
    </motion.button>
  );
}

function Scorecard({
  rows,
  generatedAt,
  winner,
  assigned,
}: {
  rows: StatsRow[];
  generatedAt: string | null;
  winner: Variant | null;
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
            const isWinner = winner === v;
            const isAssigned = assigned === v;
            return (
              <tr
                key={v}
                className={[
                  "border-t border-mute-700/40 font-mono text-sm",
                  isWinner ? "border-l-2 border-l-cyan bg-cyan/5" : "",
                ].join(" ")}
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-mono text-base font-bold text-mute-100"
                >
                  {v}
                  {isWinner && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-cyan">
                      ◆ winner
                    </span>
                  )}
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Variant | null>(null);
  const [converted, setConverted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const impressionSent = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getJSON<StatsResponse>("/api/ab/stats");
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    }
  }, []);

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    (async () => {
      try {
        const data = await postJSON<ImpressionResponse>("/api/ab/impression");
        setSessionId(data.sessionId);
        setAssigned(data.variant);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown error");
      }
      fetchStats();
    })();
  }, [fetchStats]);

  useEffect(() => {
    const t = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const handleClick = useCallback(
    async (v: Variant) => {
      if (v !== assigned || converted) return;
      try {
        await postJSON<{ ok: true; alreadyConverted: boolean }>(
          "/api/ab/click",
          { variant: v },
        );
        setConverted(true);
        if (!reduced) {
          setPulse(true);
          setShowToast(true);
          window.setTimeout(() => setPulse(false), 700);
          window.setTimeout(() => setShowToast(false), 2200);
        }
        fetchStats();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown error");
      }
    },
    [assigned, converted, fetchStats, reduced],
  );

  const handleReroll = useCallback(async () => {
    try {
      await postJSON("/api/ab/reroll");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    }
  }, []);

  const winner = useMemo(() => pickWinner(stats?.rows ?? []), [stats]);
  const query = stats?.query ?? "-- loading…";

  return (
    <Section id="lab" aria-label="Live A/B test">
      <SectionInner>
        <p className="font-mono text-xs uppercase tracking-widest text-amber">
          {"// 10 · LAB"}
        </p>
        <h2 className="mt-4 text-4xl font-semibold text-mute-100 md:text-5xl">
          Show, don&apos;t tell. A live A/B test.
        </h2>
        <p className="mt-6 max-w-2xl text-base text-mute-300">
          Your session was randomly assigned to one of two variants. Click your
          variant to record a conversion. The query and scorecard below run
          against a real SQL database — every visitor&apos;s data is in here.
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

            <div className="relative mt-6 grid grid-cols-2 gap-4">
              <VariantButton
                variant="A"
                assigned={assigned === "A"}
                converted={converted}
                pulse={pulse && assigned === "A"}
                onClick={() => handleClick("A")}
                disabled={assigned !== "A"}
                reduced={reduced}
              />
              <VariantButton
                variant="B"
                assigned={assigned === "B"}
                converted={converted}
                pulse={pulse && assigned === "B"}
                onClick={() => handleClick("B")}
                disabled={assigned !== "B"}
                reduced={reduced}
              />

              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    className="col-span-2 rounded-sm border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-xs text-cyan"
                  >
                    ✓ recorded
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handleReroll}
                className="font-mono text-xs uppercase tracking-widest text-mute-500 underline-offset-4 hover:text-cyan hover:underline"
              >
                ↻ Reroll session
              </button>
              {converted && (
                <span className="font-mono text-xs uppercase tracking-widest text-cyan">
                  conversion logged
                </span>
              )}
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
                winner={winner}
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
