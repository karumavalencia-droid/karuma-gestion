/**
 * Primitivas de firma HMAC-SHA256 compartidas por los tokens de autenticación
 * (cookie de sesión y cookie de dispositivo de confianza).
 *
 * Formato del token: `<payload-base64url>.<firma-base64url>`.
 *
 * Todo se apoya en `crypto.subtle`, así que funciona igual en el runtime Edge
 * (middleware) que en Node (route handlers).
 */

const encoder = new TextEncoder();

const DEV_FALLBACK_SECRET = "karuma-local-development-secret";

/**
 * Secret usado para FIRMAR tokens nuevos.
 *
 * Prefiere `KARUMA_AUTH_SECRET`. Cae a `SUPABASE_SERVICE_ROLE_KEY` para que la
 * autenticación siga funcionando en entornos donde aún no está provisionado
 * `KARUMA_AUTH_SECRET`. Una vez definido, la firma queda desacoplada de la key
 * de Supabase — rotar esa key ya no invalida las sesiones activas.
 */
export function getSigningSecret(): string | null {
  if (process.env.KARUMA_AUTH_SECRET) return process.env.KARUMA_AUTH_SECRET;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  return null;
}

/**
 * Secrets aceptados al VERIFICAR un token, del más nuevo al más antiguo.
 *
 * Devuelve todos los candidatos para que los tokens firmados con la key legacy
 * `SUPABASE_SERVICE_ROLE_KEY` sigan siendo válidos tras migrar la firma a
 * `KARUMA_AUTH_SECRET`: las sesiones existentes aguantan hasta caducar, sin
 * forzar un re-login. Elimina la entrada de `SUPABASE_SERVICE_ROLE_KEY` cuando
 * todas las sesiones legacy hayan expirado.
 */
export function getVerificationSecrets(): string[] {
  const secrets = [
    process.env.KARUMA_AUTH_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0 && process.env.NODE_ENV !== "production") {
    secrets.push(DEV_FALLBACK_SECRET);
  }

  // Deduplicar por si ambas variables tienen el mismo valor.
  return [...new Set(secrets)];
}

export function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64Url(value: string): Uint8Array {
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

/**
 * Serializa y firma un payload JSON.
 *
 * @throws si no hay ningún secret configurado.
 */
export async function signPayload(payload: unknown): Promise<string> {
  const secret = getSigningSecret();
  if (!secret) throw new Error("KARUMA_AUTH_SECRET is not configured");

  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verifica la firma de un token y devuelve su payload sin validar.
 *
 * El llamante es responsable de comprobar la forma del payload y su caducidad;
 * aquí solo se garantiza que el contenido no ha sido manipulado.
 */
export async function verifySignedPayload<T>(
  token: string | null | undefined,
): Promise<T | null> {
  const secrets = getVerificationSecrets();
  if (secrets.length === 0 || !token) return null;

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const signatureBuffer = toArrayBuffer(decodeBase64Url(encodedSignature));
    const payloadBytes = encoder.encode(encodedPayload);

    // Aceptamos el token si valida con cualquier secret conocido, para que las
    // firmas con la key legacy sigan siendo válidas durante la migración.
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

    return JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as T;
  } catch {
    return null;
  }
}
