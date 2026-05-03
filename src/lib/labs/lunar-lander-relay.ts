import { createPairCode, normalizePairCode } from "./pairing";

export type LunarLanderControlInput = {
  thrust: boolean;
  rotate: number;
  reset?: boolean;
};

export type LunarLanderControlSnapshot = LunarLanderControlInput & {
  reset: boolean;
  resetSequence: number;
  sequence: number;
  updatedAt: number;
};

export type LunarLanderSession = {
  pairCode: string;
  hostId: string;
  createdAt: number;
  updatedAt: number;
};

export type LunarLanderHostSnapshot = LunarLanderSession & {
  control: LunarLanderControlSnapshot | null;
};

type StoredSession = LunarLanderSession & {
  control: LunarLanderControlSnapshot | null;
};

type SessionStoreOptions = {
  now?: () => number;
  createPairCode?: () => string;
  createId?: () => string;
  ttlMs?: number;
  maxSessions?: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 8;
const DEFAULT_MAX_SESSIONS = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRandomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${createPairCode()}-${createPairCode()}`;
}

export function createLunarLanderSessionStore({
  now = () => Date.now(),
  createPairCode: createCode = createPairCode,
  createId = createRandomId,
  ttlMs = DEFAULT_TTL_MS,
  maxSessions = DEFAULT_MAX_SESSIONS,
}: SessionStoreOptions = {}) {
  const sessions = new Map<string, StoredSession>();

  function cleanupExpired(currentTime = now()): void {
    sessions.forEach((session, pairCode) => {
      if (currentTime - session.updatedAt > ttlMs) {
        sessions.delete(pairCode);
      }
    });
  }

  function evictOldestUntilRoom(): void {
    while (sessions.size >= maxSessions) {
      let oldestPairCode: string | null = null;
      let oldestUpdatedAt = Number.POSITIVE_INFINITY;

      sessions.forEach((session, pairCode) => {
        if (session.updatedAt < oldestUpdatedAt) {
          oldestUpdatedAt = session.updatedAt;
          oldestPairCode = pairCode;
        }
      });

      if (!oldestPairCode) return;
      sessions.delete(oldestPairCode);
    }
  }

  function createSession(): LunarLanderSession {
    cleanupExpired();
    evictOldestUntilRoom();

    for (let attempt = 0; attempt < 8; attempt++) {
      const pairCode = normalizePairCode(createCode());
      if (!pairCode) {
        throw new Error("Pair code factory returned an invalid code.");
      }
      if (sessions.has(pairCode)) continue;

      const currentTime = now();
      const session: StoredSession = {
        pairCode,
        hostId: createId(),
        createdAt: currentTime,
        updatedAt: currentTime,
        control: null,
      };
      sessions.set(pairCode, session);
      return {
        pairCode: session.pairCode,
        hostId: session.hostId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    }

    throw new Error("Unable to allocate a unique lunar lander pair code.");
  }

  function readHostSnapshot(
    pairCodeValue: string,
    hostId: string,
  ): LunarLanderHostSnapshot | null {
    cleanupExpired();
    const pairCode = normalizePairCode(pairCodeValue);
    if (!pairCode) return null;

    const session = sessions.get(pairCode);
    if (!session || session.hostId !== hostId) return null;

    return {
      pairCode: session.pairCode,
      hostId: session.hostId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      control: session.control ? { ...session.control } : null,
    };
  }

  function writeControl(
    pairCodeValue: string,
    input: LunarLanderControlInput,
  ): LunarLanderControlSnapshot | null {
    cleanupExpired();
    const pairCode = normalizePairCode(pairCodeValue);
    if (!pairCode) return null;

    const session = sessions.get(pairCode);
    if (!session) return null;

    const currentTime = now();
    const previousResetSequence = session.control?.resetSequence ?? 0;
    const reset = Boolean(input.reset);
    const control: LunarLanderControlSnapshot = {
      thrust: Boolean(input.thrust),
      rotate: clamp(input.rotate, -1, 1),
      reset,
      resetSequence: reset ? previousResetSequence + 1 : previousResetSequence,
      sequence: (session.control?.sequence ?? 0) + 1,
      updatedAt: currentTime,
    };
    session.control = control;
    session.updatedAt = currentTime;
    return { ...control };
  }

  return {
    createSession,
    readHostSnapshot,
    writeControl,
  };
}

export const lunarLanderSessionStore = createLunarLanderSessionStore();
