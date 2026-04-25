import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { STATS_QUERY, type StatsRow } from "@/lib/ab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await ensureSchema(db);
    const result = await db.execute(STATS_QUERY);

    const rows: StatsRow[] = result.rows.map((r) => ({
      variant: String(r.variant) as "A" | "B",
      impressions: Number(r.impressions ?? 0),
      conversions: Number(r.conversions ?? 0),
      conversion_rate_pct:
        r.conversion_rate_pct === null || r.conversion_rate_pct === undefined
          ? null
          : Number(r.conversion_rate_pct),
    }));

    return NextResponse.json(
      {
        query: STATS_QUERY,
        rows,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
