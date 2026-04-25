// Helpers for invoking the StatsAggregator Durable Object from API route
// handlers. Centralised so the routes stay focused on HTTP concerns.

import { EXPERIMENT_ID } from "@/lib/ab";
import { getCfEnv } from "@/lib/cf-env";

type EventPayload = {
  sessionId: string;
  variant: "A" | "B";
  experiment: string;
};

async function callDo(
  path: "/impression" | "/click",
  payload: EventPayload,
): Promise<Response | null> {
  const env = await getCfEnv();
  if (!env?.STATS_AGGREGATOR) return null;

  const id = env.STATS_AGGREGATOR.idFromName(EXPERIMENT_ID);
  const stub = env.STATS_AGGREGATOR.get(id);
  return stub.fetch(`http://stats-aggregator${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function recordImpressionViaDO(
  payload: EventPayload,
): Promise<{ alreadyImpressed: boolean } | null> {
  const res = await callDo("/impression", payload);
  if (!res) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StatsAggregator /impression failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { alreadyImpressed: boolean };
}

export async function recordClickViaDO(
  payload: EventPayload,
): Promise<{ alreadyConverted: boolean } | null> {
  const res = await callDo("/click", payload);
  if (!res) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StatsAggregator /click failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { alreadyConverted: boolean };
}
