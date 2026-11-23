import { createHmac, timingSafeEqual } from "crypto";

// Enlace personal del cliente para cambiar o cancelar su reserva desde el correo.
// El token es una firma HMAC del id de la reserva: no se guarda en la base de datos
// y no se puede adivinar sin el secreto del servidor.

function secreto(): string {
  return process.env.KARUMA_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "karuma-dev-reserva-cliente";
}

export function tokenReservaCliente(reservaId: string): string {
  return createHmac("sha256", secreto()).update(`reserva-cliente:${reservaId}`).digest("base64url").slice(0, 32);
}

export function verificarTokenReservaCliente(reservaId: string, token: unknown): boolean {
  if (typeof token !== "string" || token.length !== 32 || !reservaId) return false;
  const a = Buffer.from(tokenReservaCliente(reservaId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function baseUrlPublica(): string {
  if (process.env.RESERVAS_PUBLIC_URL) return process.env.RESERVAS_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://karuma.es";
}

export function enlaceGestionReserva(reservaId: string): string {
  return `${baseUrlPublica()}/reservas/gestionar?id=${encodeURIComponent(reservaId)}&t=${tokenReservaCliente(reservaId)}`;
}

// Hasta cuándo puede el cliente cambiar o cancelar por su cuenta (minutos antes de la hora).
export const LIMITE_CAMBIO_CLIENTE_MIN = 120;
