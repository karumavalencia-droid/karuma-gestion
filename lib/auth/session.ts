import type { Role } from "./permissions";
import { isValidRole } from "./permissions";

export const SESSION_COOKIE_NAME = "karuma_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

type SessionPayload = SessionUser & {
  version: 1;
  expiresAt: number;
};

const encoder = new TextEncoder();

const DEV_FALLBACK_SECRET = "karuma-local-development-secret";

/**
 * Secret used to SIGN new session tokens.
 *
 * Prefers the dedicated `KARUMA_AUTH_SECRET`. Falls back to
 * `SUPABASE_SERVICE_ROLE_KEY` so authentication keeps working before
 * `KARUMA_AUTH_SECRET` is provisioned in every environment (and so this change
 * can ship without an env-var flag day). Once `KARUMA_AUTH_SECRET` is set,
 * session signing is decoupled from the Supabase key — rotating that key no
 * longer invalidates active sessions.
 */
function getSigningSecret(): string | null {
  if (process.env.KARUMA_AUTH_SECRET) return process.env.KARUMA_AUTH_SECRET;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  return null;
}

/**
 * Secrets accepted when VERIFYING a session token, newest first.
 *
 * Returns every candidate so that tokens signed with the legacy
 * `SUPABASE_SERVICE_ROLE_KEY` remain valid after we switch signing over to
 * `KARUMA_AUTH_SECRET`. This is what makes the migration seamless: existing
 * sessions keep working until they expire, no forced re-login. Remove the
 * `SUPABASE_SERVICE_ROLE_KEY` entry once all legacy sessions have aged out
 * (>= SESSION_MAX_AGE_SECONDS after deploy).
 */
function getVerificationSecrets(): string[] {
  const secrets = [
    process.env.KARUMA_AUTH_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0 && process.env.NODE_ENV !== "production") {
    secrets.push(DEV_FALLBACK_SECRET);
  }

  // De-duplicate in case both env vars hold the same value.
  return [...new Set(secrets)];
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
  const secret = getSigningSecret();
  if (!secret) throw new Error("KARUMA_AUTH_SECRET is not configured");

  const payload: SessionPayload = {
    version: 1,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
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
  const secrets = getVerificationSecrets();
  if (secrets.length === 0 || !token) return null;

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const signatureBuffer = toArrayBuffer(decodeBase64Url(encodedSignature));
    const payloadBytes = encoder.encode(encodedPayload);

    // Accept the token if it verifies against any known secret. This keeps
    // sessions signed with the legacy Supabase key valid during migration.
    let validSignature = false;
    for (const secret of secrets) {
      const key = await getSigningKey(secret);
      if (
        await crypto.subtle.verify("HMAC", key, signatureBuffer, payloadBytes)
      ) {
        validSignature = true;
        break;
      }
    }
    if (!validSignature) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as Partial<SessionPayload>;

    if (
      payload.version !== 1 ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !isValidRole(payload.role) ||
      !(
        payload.employeeId === null ||
        typeof payload.employeeId === "string" ||
        typeof payload.employeeId === "undefined"
      ) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      employeeId:
        typeof payload.employeeId === "string" ? payload.employeeId : null,
    };
  } catch {
    return null;
  }
}
