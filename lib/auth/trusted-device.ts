/**
 * Dispositivo de confianza: permite saltarse el segundo factor (código SMS)
 * durante 30 días en el navegador donde el usuario marcó "confiar".
 *
 * Compromiso de seguridad, explícito: en un dispositivo de confianza el login
 * pasa de 2FA a solo-contraseña (admin) o solo-teléfono (oficina). Por eso:
 *
 *   - La cookie va FIRMADA (HMAC, mismo secret que la sesión) y es httpOnly:
 *     no basta con escribir una cookie a mano para saltarse el SMS.
 *   - Está ligada a un `subject` concreto (usuario admin o teléfono): confiar
 *     en el dispositivo para una cuenta no lo confía para otra.
 *   - El primer factor se sigue exigiendo siempre.
 *   - Sobrevive al logout a propósito (si no, habría que re-confiar cada vez).
 *     Para revocarla basta con borrar las cookies del navegador.
 */

import { signPayload, verifySignedPayload } from "./signing";

export const TRUSTED_DEVICE_COOKIE_NAME = "karuma_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Cuentas distintas que puede recordar un mismo navegador. */
const MAX_SUBJECTS = 5;

type TrustedDevicePayload = {
  version: 1;
  subjects: string[];
  expiresAt: number;
};

/** Identificador de la cuenta admin dentro de la cookie. */
export function adminDeviceSubject(username: string): string {
  return `admin:${username.trim().toLowerCase()}`;
}

/** Identificador de una cuenta de oficina (login por teléfono + OTP). */
export function phoneDeviceSubject(phone: string): string {
  return `phone:${phone.trim()}`;
}

export function trustedDeviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
  };
}

async function readSubjects(token: string | null | undefined): Promise<string[]> {
  const payload = await verifySignedPayload<Partial<TrustedDevicePayload>>(token);
  if (
    !payload ||
    payload.version !== 1 ||
    !Array.isArray(payload.subjects) ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt <= Date.now()
  ) {
    return [];
  }

  return payload.subjects.filter(
    (subject): subject is string => typeof subject === "string",
  );
}

/** True si este navegador es de confianza para esa cuenta concreta. */
export async function isDeviceTrustedFor(
  token: string | null | undefined,
  subject: string,
): Promise<boolean> {
  return (await readSubjects(token)).includes(subject);
}

/**
 * Devuelve el valor de cookie que añade `subject` a los ya confiados,
 * renovando la ventana de 30 días. Devuelve null si no hay secret configurado.
 */
export async function addTrustedSubject(
  token: string | null | undefined,
  subject: string,
): Promise<string | null> {
  const existing = await readSubjects(token);
  const subjects = [subject, ...existing.filter((s) => s !== subject)].slice(
    0,
    MAX_SUBJECTS,
  );

  const payload: TrustedDevicePayload = {
    version: 1,
    subjects,
    expiresAt: Date.now() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000,
  };

  try {
    return await signPayload(payload);
  } catch {
    // Sin secret configurado no podemos firmar: seguimos exigiendo 2FA.
    return null;
  }
}
