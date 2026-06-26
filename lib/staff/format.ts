import { formatStandardShift } from "./shifts";

export function formatContractHours(hours: number | null): string {
  return hours == null ? "Pendiente" : `${hours}h`;
}

export function formatStaffStatus(status: string): string {
  return status === "\u79bb\u804c" || status === "Inactivo" ? "Inactivo" : "Activo";
}

export { formatStandardShift };
