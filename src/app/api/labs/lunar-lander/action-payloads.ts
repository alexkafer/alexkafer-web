import { NextResponse } from "next/server";
import {
  LUNAR_AUTOMATION_DEFINITIONS,
  LUNAR_BODY_DEFINITIONS,
  LUNAR_RESOURCE_IDS,
  LUNAR_ROOM_DEFINITIONS,
  LUNAR_STATIONS,
  LUNAR_TECH_DEFINITIONS,
  type LunarAutomationId,
  type LunarBodyId,
  type LunarResourceId,
  type LunarResourceMap,
  type LunarRoomId,
  type LunarStationId,
  type LunarTechId,
} from "@/lib/labs/lunar-lander-domain";
import type { LunarBaseActionResult, LunarLanderActionAuth } from "@/lib/labs/lunar-lander-world";

type PayloadResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

const RESOURCE_IDS = new Set<string>(Object.values(LUNAR_RESOURCE_IDS));

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function readJsonRecord(request: Request): Promise<PayloadResult<Record<string, unknown>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  }

  if (!isRecord(body)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid payload." }, { status: 400 }) };
  }
  return { ok: true, value: body };
}

export function readActionAuth(payload: Record<string, unknown>): PayloadResult<LunarLanderActionAuth> {
  const landerId = typeof payload.landerId === "string" ? payload.landerId : "";
  const token = typeof payload.token === "string" ? payload.token : "";
  if (!landerId || !token) {
    return { ok: false, response: NextResponse.json({ error: "Missing action auth." }, { status: 400 }) };
  }
  return { ok: true, value: { landerId, token } };
}

export function readRoomId(payload: Record<string, unknown>): PayloadResult<LunarRoomId> {
  const roomId = typeof payload.roomId === "string" ? payload.roomId : "";
  if (!roomId || !(roomId in LUNAR_ROOM_DEFINITIONS)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid room." }, { status: 400 }) };
  }
  return { ok: true, value: roomId as LunarRoomId };
}

export function readTechId(payload: Record<string, unknown>): PayloadResult<LunarTechId> {
  const techId = typeof payload.techId === "string" ? payload.techId : "";
  if (!techId || !(techId in LUNAR_TECH_DEFINITIONS)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid tech." }, { status: 400 }) };
  }
  return { ok: true, value: techId as LunarTechId };
}

export function readAutomationId(payload: Record<string, unknown>): PayloadResult<LunarAutomationId> {
  const automationId = typeof payload.automationId === "string" ? payload.automationId : "";
  if (!automationId || !(automationId in LUNAR_AUTOMATION_DEFINITIONS)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid automation." }, { status: 400 }) };
  }
  return { ok: true, value: automationId as LunarAutomationId };
}

export function readBoolean(payload: Record<string, unknown>, key: string): PayloadResult<boolean> {
  if (typeof payload[key] !== "boolean") {
    return { ok: false, response: NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 }) };
  }
  return { ok: true, value: payload[key] };
}

export function readBodyId(payload: Record<string, unknown>, key = "destinationBodyId"): PayloadResult<LunarBodyId> {
  const bodyId = typeof payload[key] === "string" ? payload[key] : "";
  if (!bodyId || !(bodyId in LUNAR_BODY_DEFINITIONS)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid destination body." }, { status: 400 }) };
  }
  return { ok: true, value: bodyId as LunarBodyId };
}

export function readStationId(stationId: string): PayloadResult<LunarStationId> {
  if (!stationId || !(stationId in LUNAR_STATIONS)) {
    return { ok: false, response: NextResponse.json({ error: "Unknown station." }, { status: 404 }) };
  }
  return { ok: true, value: stationId as LunarStationId };
}

export function readCargo(payload: Record<string, unknown>): PayloadResult<LunarResourceMap> {
  if (payload.cargo === undefined) return { ok: true, value: {} };
  if (!isRecord(payload.cargo)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid cargo." }, { status: 400 }) };
  }

  const cargo: Partial<Record<LunarResourceId, number>> = {};
  for (const [resourceId, amount] of Object.entries(payload.cargo)) {
    if (!RESOURCE_IDS.has(resourceId) || typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return { ok: false, response: NextResponse.json({ error: "Invalid cargo." }, { status: 400 }) };
    }
    cargo[resourceId as LunarResourceId] = amount;
  }
  return { ok: true, value: cargo };
}

export function readPosition(
  payload: Record<string, unknown>,
): PayloadResult<{ x: number; y: number } | undefined> {
  if (payload.position === undefined) return { ok: true, value: undefined };
  if (!isRecord(payload.position)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid position." }, { status: 400 }) };
  }
  const x = payload.position.x;
  const y = payload.position.y;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid position." }, { status: 400 }) };
  }
  return { ok: true, value: { x, y } };
}

export function readPositiveNumber(
  payload: Record<string, unknown>,
  key: string,
): PayloadResult<number | undefined> {
  if (payload[key] === undefined) return { ok: true, value: undefined };
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return { ok: false, response: NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 }) };
  }
  return { ok: true, value };
}

export function actionResultResponse<T>(result: LunarBaseActionResult<T>): NextResponse {
  if (result.ok) return NextResponse.json(result.value);
  const status = result.error.startsWith("Unknown") ? 404 : result.error === "Unauthorized" || result.error === "Forbidden" ? 403 : 400;
  return NextResponse.json({ error: result.error }, { status });
}
