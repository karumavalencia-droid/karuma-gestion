export type ReservationLike = {
  estado?: unknown;
  status?: unknown;
  type?: unknown;
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
  nombre?: unknown;
  name?: unknown;
  notas?: unknown;
  notes?: unknown;
};

export const TABLE_BLOCK_NOTES_PREFIX = "[BLOQUEO_MESA]";

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

export function buildTableBlockNotes(reason?: string | null): string {
  const cleanReason = String(reason ?? "").trim();
  return cleanReason ? `${TABLE_BLOCK_NOTES_PREFIX} ${cleanReason}` : TABLE_BLOCK_NOTES_PREFIX;
}

export function stripTableBlockNotes(notes: unknown): string {
  const value = String(notes ?? "").trim();
  if (!value.startsWith(TABLE_BLOCK_NOTES_PREFIX)) return value;
  return value.slice(TABLE_BLOCK_NOTES_PREFIX.length).trim();
}

export function isTableBlockReservation(reservation: ReservationLike): boolean {
  const type = String(reservation.type ?? "").trim().toLowerCase();
  if (type === "table_block" || type === "table-block" || type === "bloqueo") return true;

  const notes = String(reservation.notas ?? reservation.notes ?? "").trim();
  return notes.startsWith(TABLE_BLOCK_NOTES_PREFIX);
}

export function getReservationGuests(reservation: ReservationLike): number {
  if (isTableBlockReservation(reservation)) return 0;

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
