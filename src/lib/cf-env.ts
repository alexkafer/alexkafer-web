// Bridge to Cloudflare bindings exposed by @opennextjs/cloudflare. Returns
// null when not running under the OpenNext adapter (e.g. plain `next dev`
// without the dev hook), letting callers fall back to libsql.

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CloudflareEnv = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB: any; // D1Database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  STATS_AGGREGATOR: any; // DurableObjectNamespace
};

export async function getCfEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return (ctx?.env as CloudflareEnv | undefined) ?? null;
  } catch {
    return null;
  }
}
