"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StatsRow } from "@/lib/ab";
import type { Variant } from "@/lib/cta-variants";

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

type Ctx = {
  sessionId: string | null;
  assigned: Variant | null;
  converted: boolean;
  stats: StatsResponse | null;
  error: string | null;
  /** Conversion rate (0..100) for the assigned variant, or null if not yet known. */
  assignedRate: number | null;
  /** Conversion rate (0..100) for the variant the user is NOT seeing. */
  otherRate: number | null;
  recordConversion: () => Promise<void>;
  reroll: () => Promise<void>;
  refreshStats: () => Promise<void>;
};

const ABContext = createContext<Ctx | null>(null);

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
  return data;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
  return data;
}

export function ABExperimentProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Variant | null>(null);
  const [converted, setConverted] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const impressionSent = useRef(false);

  const refreshStats = useCallback(async () => {
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
      refreshStats();
    })();
  }, [refreshStats]);

  useEffect(() => {
    const t = setInterval(() => {
      refreshStats();
    }, 5000);
    return () => clearInterval(t);
  }, [refreshStats]);

  const recordConversion = useCallback(async () => {
    if (!assigned || converted) return;
    try {
      await postJSON<{ ok: true; alreadyConverted: boolean }>("/api/ab/click", {
        variant: assigned,
      });
      setConverted(true);
      refreshStats();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    }
  }, [assigned, converted, refreshStats]);

  const reroll = useCallback(async () => {
    try {
      await postJSON("/api/ab/reroll");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    }
  }, []);

  const { assignedRate, otherRate } = useMemo(() => {
    const rows = stats?.rows ?? [];
    const find = (v: Variant) => rows.find((r) => r.variant === v) ?? null;
    const rateOf = (v: Variant) => {
      const r = find(v);
      if (!r || r.impressions === 0 || r.conversion_rate_pct == null) return null;
      return r.conversion_rate_pct;
    };
    if (!assigned) return { assignedRate: null, otherRate: null };
    const other: Variant = assigned === "A" ? "B" : "A";
    return { assignedRate: rateOf(assigned), otherRate: rateOf(other) };
  }, [stats, assigned]);

  const value = useMemo<Ctx>(
    () => ({
      sessionId,
      assigned,
      converted,
      stats,
      error,
      assignedRate,
      otherRate,
      recordConversion,
      reroll,
      refreshStats,
    }),
    [
      sessionId,
      assigned,
      converted,
      stats,
      error,
      assignedRate,
      otherRate,
      recordConversion,
      reroll,
      refreshStats,
    ],
  );

  return <ABContext.Provider value={value}>{children}</ABContext.Provider>;
}

export function useABExperiment(): Ctx {
  const ctx = useContext(ABContext);
  if (!ctx) {
    throw new Error("useABExperiment must be used inside <ABExperimentProvider>");
  }
  return ctx;
}
