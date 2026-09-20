/**
 * El correo de la ficha del empleado (`staff.email`).
 *
 * Es el dato con el que el portal puede hablar con cada persona: mandarle su
 * nómina, avisarla de un cambio de turno o, más adelante, enviarle el código
 * de acceso. Por eso el portal lo pide al entrar a quien todavía no lo tenga.
 */

/**
 * Dominios que NO son buzones reales.
 *
 * `lib/staff/data.ts` rellena el correo de quien no tiene uno con
 * `${slug}@karuma.es`, y el kiosco usa `@karuma.local`. Son direcciones que se
 * inventa el propio código: para el portal cuentan como "no tiene correo".
 *
 * Si algún día karuma.es tiene buzones de verdad, basta con quitarlo de aquí.
 */
const DOMINIOS_DE_RELLENO = ["karuma.es", "karuma.local"];

function tieneFormatoDeCorreo(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** ¿Es una dirección a la que se puede escribir de verdad? */
export function esCorreoUtilizable(email: string): boolean {
  if (!tieneFormatoDeCorreo(email)) return false;
  const dominio = email.slice(email.lastIndexOf("@") + 1);
  return !DOMINIOS_DE_RELLENO.includes(dominio);
}

/**
 * Normaliza (sin espacios, en minúsculas) y descarta lo que no sirve para
 * recibir un correo. Devuelve null si la ficha no tiene una dirección real.
 */
export function normalizeStaffEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return esCorreoUtilizable(email) ? email : null;
}

/** Escapa los comodines de PostgREST para comparar el correo tal cual. */
export function literalParaIlike(email: string): string {
  return email.replace(/[\\%_]/g, "\\$&");
}
