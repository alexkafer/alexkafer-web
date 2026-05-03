import { NextRequest } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readJsonRecord,
  readPosition,
  readRoomId,
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
  const roomId = readRoomId(payload.value);
  if (!roomId.ok) return roomId.response;
  const position = readPosition(payload.value);
  if (!position.ok) return position.response;

  return actionResultResponse(
    lunarLanderWorldStore.queueBaseRoom(params.baseId, roomId.value, {
      position: position.value,
      auth: auth.value,
    }),
  );
}
