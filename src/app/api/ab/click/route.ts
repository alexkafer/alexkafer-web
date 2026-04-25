import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { EXPERIMENT_ID } from "@/lib/ab";
import { getOrAssignSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const db = await getDb();
    await ensureSchema(db);
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
