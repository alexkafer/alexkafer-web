import { NextRequest, NextResponse } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import { readStationId } from "../action-payloads";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const originStationId = request.nextUrl.searchParams.get("originStationId");
  if (!originStationId) {
    return NextResponse.json(lunarLanderWorldStore.readAvailableTravelRoutes());
  }

  const station = readStationId(originStationId);
  if (!station.ok) return station.response;
  return NextResponse.json(lunarLanderWorldStore.readAvailableTravelRoutes(station.value));
}
