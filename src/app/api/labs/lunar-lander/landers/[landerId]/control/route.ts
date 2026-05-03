import { NextRequest, NextResponse } from "next/server";
import {
  lunarLanderWorldStore,
  type LunarLanderWorldControlInput,
} from "@/lib/labs/lunar-lander-world";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { landerId: string } },
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

  const payload = body as Partial<
    Record<keyof LunarLanderWorldControlInput | "token", unknown>
  >;
  const token = typeof payload.token === "string" ? payload.token : "";
  const rotate = Number(payload.rotate ?? 0);
  const lateral = payload.lateral === undefined ? undefined : Number(payload.lateral);

  if (!token) {
    return NextResponse.json({ error: "Missing control token." }, { status: 400 });
  }
  if (!Number.isFinite(rotate)) {
    return NextResponse.json(
      { error: "Invalid rotate value." },
      { status: 400 },
    );
  }
  if (lateral !== undefined && !Number.isFinite(lateral)) {
    return NextResponse.json(
      { error: "Invalid lateral value." },
      { status: 400 },
    );
  }

  const lander = lunarLanderWorldStore.writeControl(params.landerId, token, {
    thrust: Boolean(payload.thrust),
    rotate,
    ...(lateral === undefined ? {} : { lateral }),
    reset: Boolean(payload.reset),
  });

  if (!lander) {
    return NextResponse.json({ error: "Lander not found." }, { status: 404 });
  }

  return NextResponse.json(lander);
}
