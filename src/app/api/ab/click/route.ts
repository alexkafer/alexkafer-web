import { NextResponse } from "next/server";
import { EXPERIMENT_ID } from "@/lib/ab";
import { ensureSchema, getDb } from "@/lib/db";
import { getOrAssignSession } from "@/lib/session";
import { recordClickViaDO } from "@/lib/stats-aggregator-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { variant?: string };
    if (body.variant !== "A" && body.variant !== "B") {
      return NextResponse.json(
        { error: "variant must be 'A' or 'B'" },
        { status: 400 },
      );
    }

    const { sessionId, variant } = getOrAssignSession();
    if (body.variant !== variant) {
      return NextResponse.json(
        { error: `session is assigned to variant ${variant}` },
        { status: 400 },
      );
    }

    // Production path: DO-mediated atomic dedup + D1 insert.
    const doResult = await recordClickViaDO({
      sessionId,
      variant,
      experiment: EXPERIMENT_ID,
    });
    if (doResult) {
      return NextResponse.json({
        ok: true,
        alreadyConverted: doResult.alreadyConverted,
        variant,
      });
    }

    // Local libsql fallback.
    const db = await getDb();
    await ensureSchema(db);
    const existing = await db.execute(
      `SELECT 1 FROM ab_events WHERE session_id=? AND experiment=? AND event='conversion' LIMIT 1`,
      [sessionId, EXPERIMENT_ID],
    );
    const alreadyConverted = existing.rows.length > 0;
    if (!alreadyConverted) {
      await db.execute(
        `INSERT INTO ab_events (ts, session_id, experiment, variant, event) VALUES (?, ?, ?, ?, 'conversion')`,
        [Date.now(), sessionId, EXPERIMENT_ID, variant],
      );
    }
    return NextResponse.json({ ok: true, alreadyConverted, variant });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
