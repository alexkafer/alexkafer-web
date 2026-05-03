import { NextResponse } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(lunarLanderWorldStore.readWorldSnapshot());
}
