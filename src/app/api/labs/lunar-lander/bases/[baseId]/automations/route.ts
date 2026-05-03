import { NextRequest } from "next/server";
import { lunarLanderWorldStore } from "@/lib/labs/lunar-lander-world";
import {
  actionResultResponse,
  readActionAuth,
  readAutomationId,
  readBoolean,
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
  const automationId = readAutomationId(payload.value);
  if (!automationId.ok) return automationId.response;
  const enabled = readBoolean(payload.value, "enabled");
  if (!enabled.ok) return enabled.response;

  return actionResultResponse(
    lunarLanderWorldStore.toggleBaseAutomation(params.baseId, automationId.value, enabled.value, {
      auth: auth.value,
    }),
  );
}
