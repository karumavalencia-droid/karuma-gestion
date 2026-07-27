import type { SessionUser } from "./session";

/** Email que identifica a la sesión de Admin (usuario + contraseña + código SMS). */
export const ADMIN_SESSION_EMAIL = "admin@karuma.local";

/**
 * Los módulos confidenciales (CEO, AI gerente, Datos, Objetivo 100k, Beneficio,
 * Finanzas, Documentos) se reservan a la sesión de Admin y NO al rol owner: las
 * cuentas de oficina entran por OTP con el rol de su ficha, y la única que
 * existe hoy tiene rol owner, así que filtrar por rol no las dejaría fuera.
 *
 * Vive en su propio módulo —y solo importa el tipo— para que el Sidebar
 * (cliente) y el middleware (edge) lo usen sin arrastrar el HMAC ni el secreto
 * de firma de session.ts.
 */
export function isAdminSession(
  user: Pick<SessionUser, "email" | "employeeId"> | null | undefined,
): boolean {
  if (!user || user.employeeId) return false;
  return user.email.trim().toLowerCase() === ADMIN_SESSION_EMAIL;
}
