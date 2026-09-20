import { resolveStaffRow } from "@/lib/staff/identity";

/**
 * Código SMS para el portal del empleado.
 *
 * Reutiliza exactamente la misma tubería que el 2FA del administrador:
 * requestOtp()/verifyOtp() (tabla auth_otp_sessions) y sendOtpSms()
 * (SMS_PROVIDER + TWILIO_*). Aquí solo se resuelve A QUÉ número se manda.
 *
 * El número SIEMPRE sale de la ficha del empleado en la tabla `staff`.
 * Nunca se acepta un teléfono enviado por el cliente: igual que el admin
 * lo toma de KARUMA_ADMIN_PHONE, el empleado lo toma de su ficha.
 */

/**
 * Normaliza a E.164. En `staff.phone` conviven varios formatos:
 *   "623237xxx"        móvil español sin prefijo
 *   "+34 67x xxx xxx"  E.164 con espacios
 *   "+1786xxxxxxx"     número extranjero
 * requestOtp() exige /^\+\d{10,15}$/, así que hay que limpiarlos.
 */
export function normalizeEmployeePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let e164: string;
  if (trimmed.startsWith("+")) e164 = `+${digits}`;
  else if (digits.startsWith("00")) e164 = `+${digits.slice(2)}`;
  else if (/^[67]\d{8}$/.test(digits)) e164 = `+34${digits}`; // móvil español
  else if (/^34[67]\d{8}$/.test(digits)) e164 = `+${digits}`;
  else return null; // fijo, extensión o número incompleto: no sirve para SMS

  return /^\+\d{10,15}$/.test(e164) ? e164 : null;
}

/** "+34623237898" -> "+34•••••898" (mismo formato que maskPhone del admin). */
export function maskEmployeePhone(phone: string): string {
  return `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}

export type EmployeePhoneLookup =
  /** Ficha encontrada y con un móvil utilizable. */
  | { status: "ok"; phone: string }
  /** Ficha encontrada pero sin teléfono (o con uno que no sirve para SMS). */
  | { status: "sin-telefono" }
  /** No hay ficha en `staff` para este empleado, o hay más de una. */
  | { status: "sin-ficha" };

export async function getEmployeeOtpPhone(
  employeeId: string | null | undefined,
): Promise<EmployeePhoneLookup> {
  let row: { phone: string | null } | null;
  try {
    row = await resolveStaffRow<{ phone: string | null }>(employeeId, "phone", "login");
  } catch {
    return { status: "sin-ficha" };
  }
  if (!row) return { status: "sin-ficha" };

  const phone = normalizeEmployeePhone(row.phone);
  return phone ? { status: "ok", phone } : { status: "sin-telefono" };
}
