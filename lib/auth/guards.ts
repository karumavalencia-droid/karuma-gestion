import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionUser } from "./session";

/**
 * Roles con acceso de gestión al módulo de ventas (lectura + escritura).
 * Coincide con ROLE_PERMISSIONS en permissions.ts: owner y manager tienen el
 * módulo "sales" sin readOnly.
 */
const SALES_ADMIN_ROLES = new Set<SessionUser["role"]>(["owner", "manager"]);

/** Devuelve el usuario de la sesión (cookie firmada) o null si no hay sesión válida. */
export async function getSessionUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

/** ¿El usuario puede escribir datos de ventas (importar)? */
export function isSalesAdmin(user: SessionUser | null): boolean {
  return Boolean(user && SALES_ADMIN_ROLES.has(user.role));
}

/**
 * Roles que gestionan Karuma Coach (reportes de incidencias y base de
 * conocimiento). Las cuentas de empleado (con employeeId) nunca acceden,
 * aunque el middleware deje pasar /api/coach/ para el chat.
 */
const COACH_ADMIN_ROLES = new Set<SessionUser["role"]>(["owner", "manager"]);

export function isCoachAdmin(user: SessionUser | null): boolean {
  return Boolean(user && !user.employeeId && COACH_ADMIN_ROLES.has(user.role));
}
