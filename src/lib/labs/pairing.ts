export const PAIR_CODE_LENGTH = 6;
export const PAIR_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error("Secure random number generation is unavailable.");
}

export function createPairCode(bytes = getRandomBytes(PAIR_CODE_LENGTH)): string {
  if (bytes.length < PAIR_CODE_LENGTH) {
    throw new Error(`Pair codes require at least ${PAIR_CODE_LENGTH} random bytes.`);
  }

  let code = "";
  for (let i = 0; i < PAIR_CODE_LENGTH; i++) {
    code += PAIR_CODE_ALPHABET[bytes[i] % PAIR_CODE_ALPHABET.length];
  }
  return code;
}

export function normalizePairCode(value: string): string | null {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  if (normalized.length !== PAIR_CODE_LENGTH) return null;

  for (const char of normalized) {
    if (!PAIR_CODE_ALPHABET.includes(char)) return null;
  }
  return normalized;
}

export function createControllerUrl(baseUrl: string, pairCode: string): string {
  const normalized = normalizePairCode(pairCode);
  if (!normalized) {
    throw new Error(`Invalid pair code: ${pairCode}`);
  }

  const url = new URL("/labs/lunar-lander/controller", baseUrl);
  url.searchParams.set("pair", normalized);
  return url.toString();
}

export function createNetworkControllerUrl(
  {
    currentOrigin,
    networkOrigin,
    preferPortlessLan = false,
  }: {
    currentOrigin: string;
    networkOrigin?: string;
    preferPortlessLan?: boolean;
  },
  pairCode: string,
): string {
  const origin =
    networkOrigin?.trim() ||
    (preferPortlessLan ? toPortlessLanOrigin(currentOrigin) : currentOrigin);
  return createControllerUrl(origin, pairCode);
}

function toPortlessLanOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.hostname.endsWith(".localhost")) {
    url.hostname = `${url.hostname.slice(0, -".localhost".length)}.local`;
  }
  return url.origin;
}
