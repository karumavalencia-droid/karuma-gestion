import { resolveStaffRow } from "@/lib/staff/identity";

/**
 * Código de verificación para el portal del empleado.
 *
 * Reutiliza la misma tubería que el 2FA del administrador —requestEmailOtp()/
 * verifyOtp() sobre la tabla auth_otp_sessions— y el envío de correo que ya
 * usan reservas y facturas (lib/email/send.ts). Aquí solo se resuelve A QUÉ
 * dirección se manda.
 *
 * La dirección SIEMPRE sale de la ficha del empleado en la tabla `staff`.
 * Nunca se acepta un correo enviado por el cliente: igual que el admin toma
 * su teléfono de KARUMA_ADMIN_PHONE, el empleado toma el suyo de su ficha.
 */

/**
 * Dominios que NO son buzones reales.
 *
 * `lib/staff/data.ts` rellena el correo de quien no tiene uno con
 * `${slug}@karuma.es`, y el kiosco usa `@karuma.local`. Son direcciones
 * inventadas por el propio código: si mandásemos el código ahí, el empleado
 * se quedaría esperando un correo que no existe y sin poder fichar.
 *
 * Si algún día karuma.es tiene buzones de verdad, basta con quitarlo de aquí.
 */
const DOMINIOS_DE_RELLENO = ["karuma.es", "karuma.local"];

function esCorreoUtilizable(email: string): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const dominio = email.slice(email.lastIndexOf("@") + 1);
  return !DOMINIOS_DE_RELLENO.includes(dominio);
}

/** Normaliza y descarta lo que no sirve para recibir un correo. */
export function normalizeEmployeeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return esCorreoUtilizable(email) ? email : null;
}

/** "joselin@gmail.com" -> "jos•••@gmail.com" (sin revelar la dirección). */
export function maskEmployeeEmail(email: string): string {
  const corte = email.lastIndexOf("@");
  const usuario = email.slice(0, corte);
  const dominio = email.slice(corte);
  const visible = usuario.slice(0, Math.min(3, Math.max(1, usuario.length - 1)));
  return `${visible}•••${dominio}`;
}

export type EmployeeEmailLookup =
  /** Ficha encontrada y con un correo utilizable. */
  | { status: "ok"; email: string }
  /** Ficha encontrada, pero sin correo (o con uno de relleno). */
  | { status: "sin-correo" }
  /** No hay ficha en `staff` para este empleado, o hay más de una. */
  | { status: "sin-ficha" };

export async function getEmployeeOtpEmail(
  employeeId: string | null | undefined,
): Promise<EmployeeEmailLookup> {
  let row: { email: string | null } | null;
  try {
    row = await resolveStaffRow<{ email: string | null }>(employeeId, "email", "login");
  } catch {
    return { status: "sin-ficha" };
  }
  if (!row) return { status: "sin-ficha" };

  const email = normalizeEmployeeEmail(row.email);
  return email ? { status: "ok", email } : { status: "sin-correo" };
}
