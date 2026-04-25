// Database abstraction over Cloudflare D1 (production) and a local libsql
// file (development outside the OpenNext context). The two adapters expose
// the same minimal surface so route handlers don't have to care which one
// is in use. The canonical STATS_QUERY in `src/lib/ab.ts` must run unchanged
// against both, which is why `execute()` accepts a positional-args API.

import { getCfEnv } from "@/lib/cf-env";

export interface DbClient {
  execute(
    query: string,
    args?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

class CloudflareD1Adapter implements DbClient {
  // Typed as `any` to avoid a hard import on the @cloudflare/workers-types
  // shape; the runtime is always a real D1Database when this class is used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async execute(
    query: string,
    args: unknown[] = [],
  ): Promise<{ rows: Record<string, unknown>[] }> {
    const stmt = this.db.prepare(query).bind(...args);
    const result = await stmt.all();
    const rows = (result?.results ?? []) as Record<string, unknown>[];
    return { rows };
  }
}

class LibsqlAdapter implements DbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any) {}

  async execute(
    query: string,
    args: unknown[] = [],
  ): Promise<{ rows: Record<string, unknown>[] }> {
    const result = await this.client.execute({ sql: query, args });
    const rows = (result.rows ?? []).map(
      (row: Record<string, unknown>) => ({ ...row }),
    );
    return { rows };
  }
}

let cached: DbClient | null = null;
let isLibsql = false;
let libsqlSchemaReady = false;

export async function getDb(): Promise<DbClient> {
  if (cached) return cached;

  const env = await getCfEnv();
  if (env?.DB) {
    cached = new CloudflareD1Adapter(env.DB);
    isLibsql = false;
    return cached;
  }

  // Local fallback: libsql against a file. We dynamic-import so the bundler
  // doesn't try to ship @libsql/client into the Worker bundle.
  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  cached = new LibsqlAdapter(client);
  isLibsql = true;
  return cached;
}

export async function ensureSchema(db: DbClient): Promise<void> {
  // D1's schema lives in `migrations/` and is applied via
  // `wrangler d1 migrations apply`. Only the libsql fallback needs runtime
  // CREATE TABLE statements.
  if (!isLibsql || libsqlSchemaReady) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ab_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      experiment TEXT NOT NULL,
      variant TEXT NOT NULL CHECK (variant IN ('A','B')),
      event TEXT NOT NULL CHECK (event IN ('impression','conversion'))
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ab_events_exp_variant ON ab_events(experiment, variant)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ab_events_session ON ab_events(session_id)`,
  );
  libsqlSchemaReady = true;
}
