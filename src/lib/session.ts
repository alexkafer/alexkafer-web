import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export const SESSION_COOKIE = "ak_ab_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Variant = "A" | "B";

export type SessionInfo = {
  sessionId: string;
  variant: Variant;
  isNew: boolean;
};

export function variantFor(sessionId: string): Variant {
  return parseInt(sessionId.slice(0, 4), 16) % 2 === 0 ? "A" : "B";
}

export function getOrAssignSession(): SessionInfo {
  const store = cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing && /^[0-9a-f]{32}$/.test(existing)) {
    return {
      sessionId: existing,
      variant: variantFor(existing),
      isNew: false,
    };
  }
  const sessionId = randomBytes(16).toString("hex");
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return {
    sessionId,
    variant: variantFor(sessionId),
    isNew: true,
  };
}

export function clearSessionCookie() {
  const store = cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
