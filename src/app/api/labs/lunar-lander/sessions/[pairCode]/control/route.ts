import { NextRequest, NextResponse } from "next/server";
import { lunarLanderSessionStore } from "@/lib/labs/lunar-lander-relay";
import type { LunarLanderControlInput } from "@/lib/labs/lunar-lander-relay";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { pairCode: string } },
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid control payload." },
      { status: 400 },
    );
  }

  const payload = body as Partial<Record<keyof LunarLanderControlInput, unknown>>;
  const rotate = Number(payload.rotate ?? 0);

  if (!Number.isFinite(rotate)) {
    return NextResponse.json(
      { error: "Invalid rotate value." },
      { status: 400 },
    );
  }

  const control = lunarLanderSessionStore.writeControl(params.pairCode, {
    thrust: Boolean(payload.thrust),
    rotate,
    reset: Boolean(payload.reset),
  });

  if (!control) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(control);
}
