import { formatStandardShift } from "./shifts";

export function formatContractHours(hours: number | null): string {
  return hours == null ? "待确认" : `${hours}h`;
}

export { formatStandardShift };
