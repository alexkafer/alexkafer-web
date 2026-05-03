import { NextRequest, NextResponse } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readJsonRecord,
  readPositiveNumber,
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
  const amount = readPositiveNumber(payload.value, "amount");
  if (!amount.ok) return amount.response;
  const roomInstanceId =
    payload.value.roomInstanceId === undefined
      ? undefined
      : typeof payload.value.roomInstanceId === "string"
        ? payload.value.roomInstanceId
        : null;
  if (roomInstanceId === null) {
    return NextResponse.json({ error: "Invalid room instance." }, { status: 400 });
  }

  return actionResultResponse(
    lunarLanderWorldStore.repairBase(params.baseId, {
      amount: amount.value,
      roomInstanceId,
      auth: auth.value,
    }),
  );
}
