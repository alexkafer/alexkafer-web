import { NextRequest, NextResponse } from "next/server";
import {
  lunarLanderWorldStore,
  type LunarLanderPilotKind,
} from "@/lib/labs/lunar-lander-world";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let pilot: LunarLanderPilotKind = "desktop";
  let blueprintId: string | undefined;

  try {
    const body = (await request.json()) as { blueprintId?: unknown; pilot?: unknown };
    if (body.pilot === "phone") {
      pilot = "phone";
    }
    if (body.blueprintId !== undefined) {
      if (typeof body.blueprintId !== "string" || !lunarLanderWorldStore.hasLanderBlueprint(body.blueprintId)) {
        return NextResponse.json({ error: "Invalid blueprint." }, { status: 400 });
      }
      blueprintId = body.blueprintId;
    }
  } catch {
    pilot = "desktop";
  }

  return NextResponse.json(lunarLanderWorldStore.spawnLander(pilot, { blueprintId }));
}
