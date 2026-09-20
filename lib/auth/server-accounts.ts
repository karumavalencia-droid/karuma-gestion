import bcrypt from "bcryptjs";
import { isValidEmail, maskEmail } from "../email/send";
import { ADMIN_SESSION_EMAIL } from "./admin-session";
import type { SessionUser } from "./session";

/**
 * Cuenta de administrador (máximo privilegio) definida por variables de entorno:
 *
 *   KARUMA_ADMIN_USERNAME       usuario (ej. "zhou")
 *   KARUMA_ADMIN_PASSWORD_HASH  hash bcrypt de la contraseña
 *   KARUMA_ADMIN_EMAIL          correo que recibe el código de verificación
 *   KARUMA_ADMIN_PHONE          teléfono E.164 (+34...) de respaldo, por SMS
 *
 * Sin usuario+hash la cuenta queda desactivada. Con correo o teléfono
 * configurado, el login exige contraseña + código (2FA). El canal preferente
 * es el CORREO; el SMS solo se usa si no hay correo o si el envío falla.
 * En producción hace falta al menos uno de los dos; en desarrollo, si faltan
 * ambos, se entra solo con contraseña.
 */

// Se leen en cada llamada, no al cargar el módulo: así el servidor recoge un
// cambio de variable de entorno sin depender de cuándo se importó el fichero.
const adminUsername = () => (process.env.KARUMA_ADMIN_USERNAME ?? "").trim().toLowerCase();
const adminPasswordHash = () => process.env.KARUMA_ADMIN_PASSWORD_HASH ?? "";

export function getAdminPhone(): string | null {
  const phone = (process.env.KARUMA_ADMIN_PHONE ?? "").trim();
  return /^\+\d{10,15}$/.test(phone) ? phone : null;
}

/** Correo al que va el código del admin. null si no está configurado. */
export function getAdminEmail(): string | null {
  const email = (process.env.KARUMA_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return isValidEmail(email) ? email : null;
}

/** "+34625086359" -> "+34•••••359" (para mostrar sin revelar el número). */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}

/** "karuma@gmail.com" -> "kar•••@gmail.com". */
export function maskAdminEmail(email: string): string {
  return maskEmail(email);
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const user = adminUsername();
  const hash = adminPasswordHash();
  if (!user || !hash) return false;
  if (username.trim().toLowerCase() !== user) return false;
  return bcrypt.compare(password, hash);
}

export function adminSessionUser(): SessionUser {
  return {
    name: "Zhou",
    email: ADMIN_SESSION_EMAIL,
    role: "owner",
    employeeId: null,
  };
}
