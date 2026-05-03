import { NextResponse } from "next/server";
import { lunarLanderSessionStore } from "@/lib/labs/lunar-lander-relay";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = lunarLanderSessionStore.createSession();
  return NextResponse.json(session);
}
