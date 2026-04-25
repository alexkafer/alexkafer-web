import { NextResponse } from "next/server";
import { EXPERIMENT_ID } from "@/lib/ab";
import { ensureSchema, getDb } from "@/lib/db";
import { getOrAssignSession } from "@/lib/session";
import { recordImpressionViaDO } from "@/lib/stats-aggregator-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { sessionId, variant } = getOrAssignSession();

    // In production (Cloudflare): atomic dedup + D1 insert in the DO.
    const doResult = await recordImpressionViaDO({
      sessionId,
      variant,
      experiment: EXPERIMENT_ID,
    });
    if (doResult) {
      return NextResponse.json({
        sessionId,
        variant,
        alreadyImpressed: doResult.alreadyImpressed,
      });
    }

    // Local fallback (libsql, no DO available). Best-effort dedup with the
    // same SELECT-1-then-INSERT shape — fine for single-process dev.
    const db = await getDb();
    await ensureSchema(db);
    const existing = await db.execute(
      `SELECT 1 FROM ab_events WHERE session_id=? AND experiment=? AND event='impression' LIMIT 1`,
      [sessionId, EXPERIMENT_ID],
    );
    const alreadyImpressed = existing.rows.length > 0;
    if (!alreadyImpressed) {
      await db.execute(
        `INSERT INTO ab_events (ts, session_id, experiment, variant, event) VALUES (?, ?, ?, ?, 'impression')`,
        [Date.now(), sessionId, EXPERIMENT_ID, variant],
      );
    }
    return NextResponse.json({ sessionId, variant, alreadyImpressed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
