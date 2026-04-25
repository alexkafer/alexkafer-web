import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureSchema() {
  if (initialized) return;
  const db = getDb();
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
  initialized = true;
}
