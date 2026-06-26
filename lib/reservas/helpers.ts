export type ReservationLike = {
  estado?: unknown;
  status?: unknown;
  service?: unknown;
  servicio?: unknown;
  turno?: unknown;
  meal_period?: unknown;
  party_size?: unknown;
  guests?: unknown;
  personas?: unknown;
  pax?: unknown;
  mesaIds?: unknown;
  mesa_ids?: unknown;
  mesa_id?: unknown;
  table_id?: unknown;
  table_ids?: unknown;
};

const INACTIVE_STATUSES = new Set([
  "cancelled",
  "cancelada",
  "no_show",
  "noshow",
  "completed",
  "finished",
  "finalizada",
  "finalizado",
]);

export function normalizeReservationStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isActiveReservation(status: unknown): boolean {
  return !INACTIVE_STATUSES.has(normalizeReservationStatus(status));
}

export function canMoveReservation(status: unknown): boolean {
  return isActiveReservation(status);
}

export function getReservationGuests(reservation: ReservationLike): number {
  const value =
    reservation.party_size ??
    reservation.guests ??
    reservation.personas ??
    reservation.pax ??
    0;
  return Number(value) || 0;
}

export function getReservationService(reservation: ReservationLike): string {
  return String(
    reservation.service ??
    reservation.servicio ??
    reservation.turno ??
    reservation.meal_period ??
    "",
  ).toLowerCase();
}

export function getReservationStatus(reservation: ReservationLike): unknown {
  return reservation.status ?? reservation.estado;
}

export function getReservationTableIds(reservation: ReservationLike): Array<string | number> {
  const arrayValue =
    reservation.mesaIds ??
    reservation.mesa_ids ??
    reservation.table_ids;

  if (Array.isArray(arrayValue)) {
    return arrayValue.filter((id): id is string | number =>
      typeof id === "string" || typeof id === "number",
    );
  }

  const directValue = reservation.mesa_id ?? reservation.table_id;
  return typeof directValue === "string" || typeof directValue === "number"
    ? [directValue]
    : [];
}

export function countReservedTables(reservations: ReservationLike[]): number {
  return reservations.reduce(
    (total, reservation) => total + getReservationTableIds(reservation).length,
    0,
  );
}
