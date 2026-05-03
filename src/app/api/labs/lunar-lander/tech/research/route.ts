import { NextRequest } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readJsonRecord,
  readTechId,
} from "../../action-payloads";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await readJsonRecord(request);
  if (!payload.ok) return payload.response;
  const auth = readActionAuth(payload.value);
  if (!auth.ok) return auth.response;
  const techId = readTechId(payload.value);
  if (!techId.ok) return techId.response;

  return actionResultResponse(
    lunarLanderWorldStore.researchTech(techId.value, {
      auth: auth.value,
    }),
  );
}
