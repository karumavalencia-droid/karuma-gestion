import type { Role } from "./permissions";
import { isValidRole } from "./permissions";

export const SESSION_COOKIE_NAME = "karuma_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
};

type SessionPayload = SessionUser & {
  version: 1;
  expiresAt: number;
};

const encoder = new TextEncoder();

function getSessionSecret(): string | null {
  const configured =
    process.env.KARUMA_AUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "karuma-local-development-secret";
  return null;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("KARUMA_AUTH_SECRET is not configured");

  const payload: SessionPayload = {
    version: 1,
    name: user.name,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = encodeBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const key = await getSigningKey(secret);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(decodeBase64Url(encodedSignature)),
      encoder.encode(encodedPayload),
    );
    if (!validSignature) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as Partial<SessionPayload>;

    if (
      payload.version !== 1 ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !isValidRole(payload.role) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
