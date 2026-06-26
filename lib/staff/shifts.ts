/** Turnos estándar del equipo. */
export type StandardShift = "午班" | "晚班" | "全天";

export const STANDARD_SHIFT_OPTIONS: StandardShift[] = ["午班", "晚班", "全天"];

export function formatStandardShift(shift: StandardShift | null): string {
  if (shift === "午班") return "Comida";
  if (shift === "晚班") return "Cena";
  if (shift === "全天") return "Turno completo";
  return "Pendiente";
}
