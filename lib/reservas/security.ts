import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionUser,
} from "@/lib/auth/session";

const PUBLIC_RESERVATION_API_REQUESTS = new Set([
  "GET /api/reservas/config",
  "GET /api/reservas/disponibilidad",
  "POST /api/reservas/crear",
  "POST /api/reservas/lista-espera",
]);

const RESERVATION_ORIGINS = new Set(["online", "telefono", "walkin", "manual"]);

export type ReservationOrigin = "online" | "telefono" | "walkin" | "manual";

export function isPublicReservationApiRequest(pathname: string, method: string): boolean {
  return PUBLIC_RESERVATION_API_REQUESTS.has(`${method.toUpperCase()} ${pathname}`);
}

export function isReservationOrigin(value: unknown): value is ReservationOrigin {
  return typeof value === "string" && RESERVATION_ORIGINS.has(value);
}

export function canManageReservations(user: SessionUser | null): boolean {
  return Boolean(user && !user.employeeId);
}

export async function isReservationStaffRequest(request: NextRequest): Promise<boolean> {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  return canManageReservations(user);
}

export function reservationCreationNeedsStaff(input: {
  origen?: unknown;
  bloqueo?: unknown;
  forceMesaIds?: unknown;
  duracionMin?: unknown;
}): boolean {
  const origen = input.origen ?? "online";
  return (
    origen !== "online" ||
    input.bloqueo === true ||
    typeof input.forceMesaIds !== "undefined" ||
    typeof input.duracionMin !== "undefined"
  );
}
