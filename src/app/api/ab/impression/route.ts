import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { EXPERIMENT_ID } from "@/lib/ab";
import { getOrAssignSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const db = await getDb();
    await ensureSchema(db);
    const { sessionId, variant } = getOrAssignSession();

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
