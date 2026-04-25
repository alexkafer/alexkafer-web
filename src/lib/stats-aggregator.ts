// StatsAggregator Durable Object
//
// One DO instance per experiment (addressed by `idFromName(EXPERIMENT_ID)`),
// used to atomically dedup impression / conversion events for a session and
// coordinate the resulting INSERT into D1.
//
// Why a DO at all? The previous SELECT-1-then-INSERT pattern in the API
// routes had a TOCTOU race: two concurrent requests for the same session
// could both observe "no row exists" and both insert. Durable Objects are
// single-threaded per id, and `blockConcurrencyWhile` makes the
// check-then-write strictly serial.
//
// State model:
//   - in-memory `Set<sessionId>` per event type for O(1) dedup
//   - mirror counters {impressions, conversions} per variant for snappy reads
//   - both persisted to DO storage so they survive eviction/restarts

type Variant = "A" | "B";
type EventType = "impression" | "conversion";

type Counters = {
  A: { impressions: number; conversions: number };
  B: { impressions: number; conversions: number };
};

type EventBody = {
  sessionId?: unknown;
  variant?: unknown;
  experiment?: unknown;
};

// Minimal structural types so we don't depend on @cloudflare/workers-types
// at compile time (runtime is always real DO + D1).
interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
}
interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface Env {
  DB: D1Database;
}

const STORAGE_KEYS = {
  impressions: "impressions",
  conversions: "conversions",
  counters: "counters",
} as const;

function emptyCounters(): Counters {
  return {
    A: { impressions: 0, conversions: 0 },
    B: { impressions: 0, conversions: 0 },
  };
}

function isVariant(v: unknown): v is Variant {
  return v === "A" || v === "B";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class StatsAggregator {
  private state: DurableObjectState;
  private env: Env;
  private impressions = new Set<string>();
  private conversions = new Set<string>();
  private counters: Counters = emptyCounters();
  private hydrated = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // Load persisted state before serving any request.
    this.state.blockConcurrencyWhile(async () => {
      const [imp, conv, counters] = await Promise.all([
        this.state.storage.get<string[]>(STORAGE_KEYS.impressions),
        this.state.storage.get<string[]>(STORAGE_KEYS.conversions),
        this.state.storage.get<Counters>(STORAGE_KEYS.counters),
      ]);
      if (imp) this.impressions = new Set(imp);
      if (conv) this.conversions = new Set(conv);
      if (counters) this.counters = counters;
      this.hydrated = true;
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (req.method === "POST" && url.pathname === "/impression") {
        return await this.handleEvent(req, "impression");
      }
      if (req.method === "POST" && url.pathname === "/click") {
        return await this.handleEvent(req, "conversion");
      }
      if (req.method === "GET" && url.pathname === "/counters") {
        // Don't strictly need blockConcurrencyWhile for a read, but be
        // defensive in case hydration hasn't completed (it always will have,
        // since the constructor's blockConcurrencyWhile gates fetch()).
        return jsonResponse({ counters: this.counters });
      }
      return jsonResponse({ error: "not found" }, 404);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return jsonResponse({ error: msg }, 500);
    }
  }

  private async handleEvent(
    req: Request,
    event: EventType,
  ): Promise<Response> {
    const body = (await req.json().catch(() => ({}))) as EventBody;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : null;
    const variant = isVariant(body.variant) ? body.variant : null;
    const experiment =
      typeof body.experiment === "string" ? body.experiment : null;

    if (!sessionId || !variant || !experiment) {
      return jsonResponse(
        { error: "sessionId, variant, experiment required" },
        400,
      );
    }

    const set =
      event === "impression" ? this.impressions : this.conversions;

    // Single-threaded gate: dedup check, D1 insert, and storage commit
    // are atomic with respect to other DO requests.
    const result = await this.state.blockConcurrencyWhile(async () => {
      if (set.has(sessionId)) {
        return { duplicate: true };
      }
      // Optimistically mark in memory so a concurrent request from this
      // session (which would be queued behind us anyway) is rejected.
      set.add(sessionId);
      this.counters[variant][
        event === "impression" ? "impressions" : "conversions"
      ] += 1;

      try {
        await this.env.DB.prepare(
          `INSERT INTO ab_events (ts, session_id, experiment, variant, event)
           VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(Date.now(), sessionId, experiment, variant, event)
          .run();
      } catch (err) {
        // Roll the in-memory state back so the next attempt can retry.
        set.delete(sessionId);
        this.counters[variant][
          event === "impression" ? "impressions" : "conversions"
        ] -= 1;
        throw err;
      }

      // Persist incrementally. Storage writes here are ordered and durable.
      await Promise.all([
        this.state.storage.put(
          event === "impression"
            ? STORAGE_KEYS.impressions
            : STORAGE_KEYS.conversions,
          Array.from(set),
        ),
        this.state.storage.put(STORAGE_KEYS.counters, this.counters),
      ]);

      return { duplicate: false };
    });

    if (event === "impression") {
      return jsonResponse({ alreadyImpressed: result.duplicate });
    }
    return jsonResponse({ alreadyConverted: result.duplicate });
  }

  // Exposed for tests/inspection.
  get _hydrated() {
    return this.hydrated;
  }
}
