import { NextRequest, NextResponse } from "next/server";
import { lunarLanderSessionStore } from "@/lib/labs/lunar-lander-relay";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { pairCode: string } },
) {
  const hostId = request.nextUrl.searchParams.get("hostId");
  if (!hostId) {
    return NextResponse.json({ error: "Missing hostId." }, { status: 400 });
  }

  const snapshot = lunarLanderSessionStore.readHostSnapshot(
    params.pairCode,
    hostId,
  );
  if (!snapshot) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
