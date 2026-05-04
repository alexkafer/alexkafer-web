import type {
  LunarLanderPilotKind,
  LunarLanderWorldControlInput,
  LunarLanderWorldLander,
  LunarLanderWorldSnapshot,
} from "./lunar-lander-world";

export const LUNAR_LANDER_PARTY = {
  party: "lunar-lander-party",
  defaultRoom: "moon-alpha",
  prefix: "parties",
} as const;

export type LunarLanderPartyRole = "spectator" | "pilot";

export type LunarLanderPartyJoinMessage = {
  type: "join";
  role: LunarLanderPartyRole;
};

export type LunarLanderPartySpawnMessage = {
  type: "spawn";
  pilot: LunarLanderPilotKind;
  blueprintId?: string;
};

export type LunarLanderPartyInputMessage = LunarLanderWorldControlInput & {
  type: "input";
  landerId: string;
  token: string;
};

export type LunarLanderPartyPingMessage = {
  type: "ping";
  nonce?: string;
};

export type LunarLanderPartyClientMessage =
  | LunarLanderPartyJoinMessage
  | LunarLanderPartySpawnMessage
  | LunarLanderPartyInputMessage
  | LunarLanderPartyPingMessage;

export type LunarLanderPartyHelloMessage = {
  type: "hello";
  room: string;
  connectionId: string;
  serverTime: number;
};

export type LunarLanderPartySnapshotMessage = {
  type: "snapshot";
  seq: number;
  snapshot: LunarLanderWorldSnapshot;
};

export type LunarLanderPartySpawnedMessage = {
  type: "spawned";
  lander: LunarLanderWorldLander;
  controlToken: string;
};

export type LunarLanderPartyControlledMessage = {
  type: "controlled";
  lander: LunarLanderWorldLander;
};

export type LunarLanderPartyPongMessage = {
  type: "pong";
  nonce?: string;
  serverTime: number;
};

export type LunarLanderPartyErrorMessage = {
  type: "error";
  message: string;
};

export type LunarLanderPartyServerMessage =
  | LunarLanderPartyHelloMessage
  | LunarLanderPartySnapshotMessage
  | LunarLanderPartySpawnedMessage
  | LunarLanderPartyControlledMessage
  | LunarLanderPartyPongMessage
  | LunarLanderPartyErrorMessage;

export type LunarLanderPartyDecodeResult =
  | { ok: true; value: LunarLanderPartyClientMessage }
  | { ok: false; error: string };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPilotKind(value: unknown): value is LunarLanderPilotKind {
  return value === "desktop" || value === "phone";
}

function isPartyRole(value: unknown): value is LunarLanderPartyRole {
  return value === "spectator" || value === "pilot";
}

function messageDataToString(data: string | ArrayBuffer | ArrayBufferView): string | null {
  if (typeof data === "string") return data;
  const decoder = new TextDecoder();
  if (data instanceof ArrayBuffer) return decoder.decode(data);
  if (ArrayBuffer.isView(data)) {
    return decoder.decode(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  return null;
}

export function encodeLunarLanderPartyMessage(
  message: LunarLanderPartyClientMessage | LunarLanderPartyServerMessage,
): string {
  return JSON.stringify(message);
}

export function decodeLunarLanderPartyClientMessage(
  data: string | ArrayBuffer | ArrayBufferView,
): LunarLanderPartyDecodeResult {
  const messageText = messageDataToString(data);
  if (!messageText) return { ok: false, error: "Expected text JSON message" };

  let decoded: unknown;
  try {
    decoded = JSON.parse(messageText);
  } catch {
    return { ok: false, error: "Malformed JSON message" };
  }

  if (!isRecord(decoded)) return { ok: false, error: "Message must be an object" };
  if (decoded.type === "join") {
    return isPartyRole(decoded.role)
      ? { ok: true, value: { type: "join", role: decoded.role } }
      : { ok: false, error: "Join message requires role spectator or pilot" };
  }

  if (decoded.type === "spawn") {
    if (!isPilotKind(decoded.pilot)) {
      return { ok: false, error: "Spawn message requires pilot desktop or phone" };
    }
    const blueprintId = optionalString(decoded.blueprintId);
    return {
      ok: true,
      value: {
        type: "spawn",
        pilot: decoded.pilot,
        ...(blueprintId ? { blueprintId } : {}),
      },
    };
  }

  if (decoded.type === "input") {
    const landerId = requiredString(decoded.landerId);
    const token = requiredString(decoded.token);
    const rotate = finiteNumber(decoded.rotate);
    if (!landerId || !token || rotate === null) {
      return { ok: false, error: "Input message requires landerId, token, and numeric rotate" };
    }
    const lateral = decoded.lateral === undefined ? undefined : finiteNumber(decoded.lateral);
    if (decoded.lateral !== undefined && lateral === null) {
      return { ok: false, error: "Input message lateral must be numeric when supplied" };
    }

    return {
      ok: true,
      value: {
        type: "input",
        landerId,
        token,
        thrust: decoded.thrust === true,
        rotate,
        ...(lateral === undefined || lateral === null ? {} : { lateral }),
        ...(decoded.reset === true ? { reset: true } : {}),
      },
    };
  }

  if (decoded.type === "ping") {
    const nonce = optionalString(decoded.nonce);
    return {
      ok: true,
      value: {
        type: "ping",
        ...(nonce ? { nonce } : {}),
      },
    };
  }

  return { ok: false, error: "Unknown lunar lander party message type" };
}

export function decodeLunarLanderPartyServerMessage(
  data: string,
): LunarLanderPartyServerMessage | null {
  const decoded = JSON.parse(data) as unknown;
  return isRecord(decoded) && typeof decoded.type === "string"
    ? (decoded as LunarLanderPartyServerMessage)
    : null;
}
