import { getSupabaseAdmin, isSupabaseConfigured } from "../supabase/admin";
import type { DbTurnoInsert, TurnoServicio } from "../supabase/types";
import { WEEK_DAYS } from "./constants";
import { EMPLOYEE_SCHEDULES } from "./mock";

/** Turno de un día concreto tal y como lo ve el empleado en el portal. */
export type PortalShift = {
  servicio: Exclude<TurnoServicio, "Descanso">;
  inicio: string;
  fin: string;
};

export type PortalDay = {
  /** 0 = Domingo ... 6 = Sábado (convención JS / horario_semanal) */
  dia: number;
  descanso: boolean;
  turnos: PortalShift[];
};

export type PortalWeek = {
  days: PortalDay[];
  /** "supabase" cuando la tabla turnos responde; "plantilla" si se usa el mock local. */
  source: "supabase" | "plantilla";
};

/** WEEK_DAYS va de 周一 (lunes) a 周日 (domingo); lo pasamos a 0=domingo..6=sábado. */
function weekDayIndexToDia(index: number): number {
  return (index + 1) % 7;
}

function classifyServicio(start: string): Exclude<TurnoServicio, "Descanso"> {
  return start < "17:00" ? "Comida" : "Cena";
}

/** PostgREST devuelve TIME como "11:30:00"; en el portal mostramos "11:30". */
function trimTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * Convierte la plantilla semanal de un empleado (lib/schedule/mock.ts) en
 * filas de la tabla turnos. Se usa como fallback del portal y como fuente
 * del seed (scripts/seed-turnos.ts).
 */
export function turnoRowsFromMock(employeeKey: string): DbTurnoInsert[] | null {
  const schedule = EMPLOYEE_SCHEDULES.find((row) => row.id === employeeKey);
  if (!schedule) return null;

  const rows: DbTurnoInsert[] = [];
  WEEK_DAYS.forEach((weekDay, index) => {
    const dia = weekDayIndexToDia(index);
    const day = schedule.days[weekDay];
    if (day.type !== "work" || day.segments.length === 0) {
      rows.push({ employee_key: employeeKey, dia, servicio: "Descanso" });
      return;
    }
    for (const segment of day.segments) {
      rows.push({
        employee_key: employeeKey,
        dia,
        servicio: classifyServicio(segment.start),
        hora_inicio: segment.start,
        hora_fin: segment.end,
      });
    }
  });
  return rows;
}

export function allTurnoRowsFromMock(): DbTurnoInsert[] {
  return EMPLOYEE_SCHEDULES.flatMap((schedule) => turnoRowsFromMock(schedule.id) ?? []);
}

function weekFromRows(
  rows: Pick<DbTurnoInsert, "dia" | "servicio" | "hora_inicio" | "hora_fin">[],
  source: PortalWeek["source"],
): PortalWeek {
  const days: PortalDay[] = Array.from({ length: 7 }, (_, dia) => ({
    dia,
    descanso: false,
    turnos: [],
  }));

  for (const row of rows) {
    const day = days[row.dia];
    if (!day) continue;
    if (row.servicio === "Descanso") {
      day.descanso = true;
      continue;
    }
    if (!row.hora_inicio || !row.hora_fin) continue;
    day.turnos.push({
      servicio: row.servicio,
      inicio: trimTime(row.hora_inicio),
      fin: trimTime(row.hora_fin),
    });
  }

  for (const day of days) {
    day.turnos.sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (day.turnos.length === 0) day.descanso = true;
  }

  return { days, source };
}

/**
 * Semana del empleado: lee la tabla turnos de Supabase y, si aún no está
 * migrada (tabla ausente o vacía) o Supabase no está configurado, cae a la
 * plantilla local de lib/schedule/mock.ts.
 */
export async function getEmployeeWeek(employeeKey: string): Promise<PortalWeek> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from("turnos")
        .select("dia, servicio, hora_inicio, hora_fin")
        .eq("employee_key", employeeKey);
      if (!error && data && data.length > 0) {
        return weekFromRows(data, "supabase");
      }
    }
  }

  return weekFromRows(turnoRowsFromMock(employeeKey) ?? [], "plantilla");
}
