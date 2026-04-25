// Helpers for invoking the StatsAggregator Durable Object from API route
// handlers. Centralised so the routes stay focused on HTTP concerns.

import { EXPERIMENT_ID } from "@/lib/ab";
import { getCfEnv } from "@/lib/cf-env";

type EventPayload = {
  sessionId: string;
  variant: "A" | "B";
  experiment: string;
};

/**
 * Whether to skip the Durable Object path and let routes fall back to the
 * libsql adapter.
 *
 * `next dev` boots a miniflare instance via wrangler's `getPlatformProxy()`
 * (see initOpenNextCloudflareForDev). Custom Durable Object classes exported
 * from a custom worker file don't reliably register through that bundling
 * path — the binding is present on `env`, but invoking `stub.fetch()` throws
 * `no such actor class`. This is a known limitation:
 * https://github.com/opennextjs/opennextjs-cloudflare/issues/690
 *
 * Production (the deployed Worker) sets NODE_ENV=production, so we only
 * short-circuit in dev. `npm run cf:preview` runs the real OpenNext bundle
 * inside `wrangler dev` and DOs work there.
 */
function shouldSkipDurableObject(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function callDo(
  path: "/impression" | "/click",
  payload: EventPayload,
): Promise<Response | null> {
  if (shouldSkipDurableObject()) return null;

  const env = await getCfEnv();
  if (!env?.STATS_AGGREGATOR) return null;

  try {
    const id = env.STATS_AGGREGATOR.idFromName(EXPERIMENT_ID);
    const stub = env.STATS_AGGREGATOR.get(id);
    return await stub.fetch(`http://stats-aggregator${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Belt-and-suspenders: if the DO binding is misconfigured in any
    // environment we haven't explicitly excluded above, fall through to the
    // libsql adapter rather than 500ing the request.
    console.warn(
      "[stats-aggregator] DO call failed, falling back to libsql:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
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
