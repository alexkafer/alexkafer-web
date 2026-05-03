import { NextRequest } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readBodyId,
  readCargo,
  readJsonRecord,
  readStationId,
} from "../../../action-payloads";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { originStationId: string } },
) {
  const originStationId = readStationId(params.originStationId);
  if (!originStationId.ok) return originStationId.response;
  const payload = await readJsonRecord(request);
  if (!payload.ok) return payload.response;
  const auth = readActionAuth(payload.value);
  if (!auth.ok) return auth.response;
  const destinationBodyId = readBodyId(payload.value);
  if (!destinationBodyId.ok) return destinationBodyId.response;
  const cargo = readCargo(payload.value);
  if (!cargo.ok) return cargo.response;

  return actionResultResponse(
    lunarLanderWorldStore.planStationTransfer(originStationId.value, destinationBodyId.value, {
      cargo: cargo.value,
      auth: auth.value,
    }),
  );
}
