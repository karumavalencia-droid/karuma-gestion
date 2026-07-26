/**
 * Inbox — horario de atención.
 *
 * El horario de `inbox_settings.horario` está en hora local del restaurante
 * ("13:00"-"15:00"), pero el servidor de Vercel va en UTC. Comparar sin
 * convertir daría dos horas de desfase en verano y una en invierno, así que
 * la hora local se obtiene siempre con `Intl` y la zona explícita.
 *
 * La decisión es una función pura para poder probarla sin depender del reloj.
 */

/** Zona del restaurante. Si algún día hay otro local, esto pasa a inbox_settings. */
export const ZONA_RESTAURANTE = "Europe/Madrid";

/** Tramos del día: { comida: ["13:00","15:00"], cena: ["19:30","22:00"] } */
export type Horario = Record<string, [string, string]>;

export const HORARIO_POR_DEFECTO: Horario = {
  comida: ["13:00", "15:00"],
  cena: ["19:30", "22:00"],
};

/** "13:45" → 825 minutos desde medianoche. Devuelve null si no es una hora. */
export function aMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora?.trim() ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * ¿`hhmm` cae dentro de algún tramo del horario?
 *
 * El inicio cuenta y el final no: a las 15:00 en punto el turno de comida ya
 * ha terminado. Un tramo que cruza la medianoche ("23:00"-"01:00") también
 * funciona.
 */
export function dentroDeHorario(horario: Horario, hhmm: string): boolean {
  const ahora = aMinutos(hhmm);
  if (ahora === null) return false;

  for (const tramo of Object.values(horario ?? {})) {
    if (!Array.isArray(tramo) || tramo.length !== 2) continue;
    const inicio = aMinutos(tramo[0]);
    const fin = aMinutos(tramo[1]);
    if (inicio === null || fin === null) continue;

    if (inicio <= fin) {
      if (ahora >= inicio && ahora < fin) return true;
    } else {
      // Cruza medianoche: dentro si va después del inicio o antes del final.
      if (ahora >= inicio || ahora < fin) return true;
    }
  }
  return false;
}

/** Hora local del restaurante en formato "HH:MM". */
export function horaLocal(fecha: Date, zona = ZONA_RESTAURANTE): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

/** Atajo: ¿estamos atendiendo ahora mismo? */
export function enHorarioAhora(horario: Horario, ahora = new Date()): boolean {
  return dentroDeHorario(horario, horaLocal(ahora));
}
