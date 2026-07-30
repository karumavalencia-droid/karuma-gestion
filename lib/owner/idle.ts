// ─── Inactividad de la zona privada (re-verificación a los 15 min) ────────────
// Cookie httpOnly firmada con HMAC (KARUMA_AUTH_SECRET) que guarda el instante
// de la última actividad del propietario. Si se supera el límite, /owner exige
// volver a verificar el MFA. Firmada para que el cliente no pueda alargar su
// propia ventana de inactividad.
//
// Usa Web Crypto (crypto.subtle) como lib/auth/session.ts para funcionar tanto
// en Node como en el edge (middleware).

export const OWNER_ACTIVITY_COOKIE = "karuma_owner_active";
export const OWNER_IDLE_LIMIT_MS = 15 * 60 * 1000;

const encoder = new TextEncoder();

function secret(): string {
  return (
    process.env.KARUMA_AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "karuma-local-development-secret"
  );
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(new Uint8Array(sig));
}

/** Valor firmado `<ts>.<hmac>` para la cookie de actividad. */
export async function signActivity(now = Date.now()): Promise<string> {
  const ts = String(now);
  return `${ts}.${await sign(ts)}`;
}

/**
 * Verifica la cookie de actividad. Devuelve si es válida (firma correcta) y si
 * ha caducado por inactividad. Ausente o manipulada => no válida.
 */
export async function checkActivity(
  raw: string | undefined | null,
  now = Date.now(),
): Promise<{ valid: boolean; expired: boolean }> {
  if (!raw) return { valid: false, expired: true };
  const [ts, mac] = raw.split(".");
  if (!ts || !mac || !/^\d+$/.test(ts)) return { valid: false, expired: true };
  if ((await sign(ts)) !== mac) return { valid: false, expired: true };
  const expired = now - Number(ts) > OWNER_IDLE_LIMIT_MS;
  return { valid: true, expired };
}
