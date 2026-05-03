import { NextRequest } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readCargo,
  readJsonRecord,
} from "../../../action-payloads";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { baseId: string } },
) {
  const payload = await readJsonRecord(request);
  if (!payload.ok) return payload.response;
  const auth = readActionAuth(payload.value);
  if (!auth.ok) return auth.response;
  const cargo = readCargo(payload.value);
  if (!cargo.ok) return cargo.response;

  return actionResultResponse(
    lunarLanderWorldStore.launchBaseAscent(params.baseId, {
      cargo: cargo.value,
      auth: auth.value,
    }),
  );
}
