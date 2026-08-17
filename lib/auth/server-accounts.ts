import bcrypt from "bcryptjs";
import { ADMIN_SESSION_EMAIL } from "./admin-session";
import type { SessionUser } from "./session";

/**
 * Cuenta de administrador (máximo privilegio) definida por variables de entorno:
 *
 *   KARUMA_ADMIN_USERNAME       usuario (ej. "zhou")
 *   KARUMA_ADMIN_PASSWORD_HASH  hash bcrypt de la contraseña
 *   KARUMA_ADMIN_PHONE          teléfono E.164 (+34...) que recibe el código SMS
 *
 * Sin usuario+hash la cuenta queda desactivada. Con KARUMA_ADMIN_PHONE
 * configurado, el login exige contraseña + código SMS (2FA). En producción
 * el teléfono es obligatorio; en desarrollo, si falta, entra solo con contraseña.
 */

const ADMIN_USERNAME = (process.env.KARUMA_ADMIN_USERNAME ?? "").trim().toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.KARUMA_ADMIN_PASSWORD_HASH ?? "";
const ADMIN_PHONE = (process.env.KARUMA_ADMIN_PHONE ?? "").trim();

// Cuenta operativa de Oficina. La contraseña se guarda únicamente como hash;
// sin KARUMA_OFICINA_PASSWORD_HASH la cuenta queda desactivada (igual que admin).
const OFICINA_USERNAME = "oficina";
const OFICINA_PASSWORD_HASH = process.env.KARUMA_OFICINA_PASSWORD_HASH ?? "";

export function getAdminPhone(): string | null {
  return /^\+\d{10,15}$/.test(ADMIN_PHONE) ? ADMIN_PHONE : null;
}

/** "+34625086359" -> "+34•••••359" (para mostrar sin revelar el número). */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) return false;
  if (username.trim().toLowerCase() !== ADMIN_USERNAME) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export async function verifyOficinaCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (!OFICINA_PASSWORD_HASH) return false;
  if (username.trim().toLowerCase() !== OFICINA_USERNAME) return false;
  return bcrypt.compare(password, OFICINA_PASSWORD_HASH);
}

export function oficinaSessionUser(): SessionUser {
  return {
    name: "Oficina Karuma",
    email: "oficina@karuma.local",
    role: "manager",
    employeeId: null,
  };
}

export function adminSessionUser(): SessionUser {
  return {
    name: "Zhou",
    email: ADMIN_SESSION_EMAIL,
    role: "owner",
    employeeId: null,
  };
}
