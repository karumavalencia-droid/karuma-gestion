import type { Mesa, Reserva, ReservasConfig, SlotDisponible } from "./types";

/** Genera lista de horas en intervalos desde inicio hasta fin (último pase) */
export function generarSlots(inicio: string, fin: string, intervaloMin: number): string[] {
  const slots: string[] = [];
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fin.split(":").map(Number);
  let totalMin = hI * 60 + mI;
  const finMin = hF * 60 + mF;
  while (totalMin <= finMin) {
    const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
    const m = (totalMin % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    totalMin += intervaloMin;
  }
  return slots;
}

function configTurnoGapMin(config: ReservasConfig): number {
  return Math.max(0, Number(config.turno_gap_min ?? 30));
}

/** Comprueba si dos turnos no dejan el margen mínimo entre fin e inicio */
function solapan(horaA: string, durA: number, horaB: string, durB: number, gapMin = 0): boolean {
  const toMin = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  };
  const aIni = toMin(horaA);
  const aFin = aIni + durA;
  const bIni = toMin(horaB);
  const bFin = bIni + durB;
  return aIni < bFin + gapMin && bIni < aFin + gapMin;
}

/** Devuelve ids de mesas ocupadas en un slot concreto */
export function mesasOcupadasEnSlot(
  reservas: Reserva[],
  fecha: string,
  hora: string,
  duracionMin: number,
  turnoGapMin = 0,
): Set<number> {
  const ocupadas = new Set<number>();
  for (const r of reservas) {
    if (r.fecha !== fecha) continue;
    if (r.estado === "Cancelada" || r.estado === "NoShow") continue;
    if (solapan(hora, duracionMin, r.hora_inicio, r.duracion_min, turnoGapMin)) {
      r.mesa_ids.forEach((id) => ocupadas.add(id));
    }
  }
  return ocupadas;
}

/** Asigna la mesa más pequeña que quepa para `personas`, respetando el % walk-in */
export function asignarMesa(
  mesas: Mesa[],
  reservas: Reserva[],
  fecha: string,
  hora: string,
  duracionMin: number,
  personas: number,
  config: ReservasConfig,
): number[] | null {
  const turnoGapMin = configTurnoGapMin(config);
  const ocupadas = mesasOcupadasEnSlot(reservas, fecha, hora, duracionMin, turnoGapMin);

  // Calcular aforo online disponible
  const totalCapacidad = mesas
    .filter((m) => m.activa)
    .reduce((sum, m) => sum + m.capacidad, 0);
  const maxOnline = Math.floor((totalCapacidad * config.capacidad_online_pct) / 100);
  const personasYaOnline = reservas
    .filter(
      (r) =>
        r.fecha === fecha &&
        r.origen === "online" &&
        r.estado !== "Cancelada" &&
        r.estado !== "NoShow" &&
        solapan(hora, duracionMin, r.hora_inicio, r.duracion_min, turnoGapMin),
    )
    .reduce((sum, r) => sum + r.personas, 0);
  if (personasYaOnline + personas > maxOnline) return null;

  // Buscar la mesa individual más pequeña que quepa
  const libres = mesas
    .filter((m) => m.activa && !ocupadas.has(m.id) && m.capacidad >= personas)
    .sort((a, b) => a.capacidad - b.capacidad);
  if (libres.length > 0) return [libres[0].id];

  // Intentar combinar mesas de la misma zona
  const zonas = [...new Set(mesas.filter((m) => m.activa && m.combinable).map((m) => m.zona))];
  for (const zona of zonas) {
    const candidatas = mesas
      .filter((m) => m.activa && m.combinable && m.zona === zona && !ocupadas.has(m.id))
      .sort((a, b) => b.capacidad - a.capacidad);
    let acum = 0;
    const seleccionadas: number[] = [];
    for (const m of candidatas) {
      acum += m.capacidad;
      seleccionadas.push(m.id);
      if (acum >= personas) return seleccionadas;
    }
  }

  return null;
}

/** Calcula todos los slots disponibles para una fecha, servicio y nº personas */
export function calcularSlotsDisponibles(
  mesas: Mesa[],
  reservas: Reserva[],
  config: ReservasConfig,
  fecha: string,
  servicio: "comida" | "cena",
  personas: number,
): SlotDisponible[] {
  const duracion = personas <= 2 ? config.duracion_1_2_min : config.duracion_3_4_min;
  const inicio = servicio === "comida" ? config.comida_inicio : config.cena_inicio;
  const fin = servicio === "comida" ? config.comida_fin : config.cena_fin;
  const slots = generarSlots(inicio, fin, config.intervalo_min);
  return slots.map((hora) => ({
    hora,
    disponible: asignarMesa(mesas, reservas, fecha, hora, duracion, personas, config) !== null,
  }));
}
