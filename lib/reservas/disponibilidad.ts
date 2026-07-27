import type { Mesa, Reserva, ReservasConfig, SlotDisponible } from "./types";
import { isActiveReservation } from "./helpers";

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

function sonAdyacentes(a: Mesa, b: Mesa): boolean {
  return (a.adjacent_mesa_ids ?? []).includes(b.id)
    && (b.adjacent_mesa_ids ?? []).includes(a.id);
}

function combinacionValida(mesas: Mesa[]): boolean {
  if (mesas.length < 2) return false;
  const visitadas = new Set<number>([mesas[0].id]);
  const pendientes = [mesas[0]];
  while (pendientes.length > 0) {
    const actual = pendientes.shift()!;
    for (const candidata of mesas) {
      if (!visitadas.has(candidata.id) && sonAdyacentes(actual, candidata)) {
        visitadas.add(candidata.id);
        pendientes.push(candidata);
      }
    }
  }
  return visitadas.size === mesas.length;
}

function combinaciones<T>(items: T[], cantidad: number): T[][] {
  if (cantidad === 0) return [[]];
  if (items.length < cantidad) return [];
  const resultado: T[][] = [];
  items.forEach((item, index) => {
    for (const resto of combinaciones(items.slice(index + 1), cantidad - 1)) {
      resultado.push([item, ...resto]);
    }
  });
  return resultado;
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
    if (!isActiveReservation(r.estado)) continue;
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
        isActiveReservation(r.estado) &&
        solapan(hora, duracionMin, r.hora_inicio, r.duracion_min, turnoGapMin),
    )
    .reduce((sum, r) => sum + r.personas, 0);
  if (personasYaOnline + personas > maxOnline) return null;

  // Buscar la mesa individual más pequeña que quepa
  const libres = mesas
    .filter((m) =>
      m.activa
      && !ocupadas.has(m.id)
      && (personas <= 2 ? m.capacidad === 2 : m.capacidad >= personas),
    )
    .sort((a, b) => a.capacidad - b.capacidad);
  if (libres.length > 0) return [libres[0].id];

  // Solo se combinan mesas con una relación de adyacencia explícita y mutua.
  // Para 5–6 personas se prueban primero dos mesas (p. ej. 4+2) y después tres.
  if (personas < 5) return null;

  const candidatas = mesas
    .filter((m) => m.activa && m.combinable && !ocupadas.has(m.id))
    .sort((a, b) => b.capacidad - a.capacidad || a.numero - b.numero);
  for (const cantidad of [2, 3]) {
    const opciones = combinaciones(candidatas, cantidad)
      .filter(combinacionValida)
      .filter((opcion) => opcion.reduce((total, mesa) => total + mesa.capacidad, 0) >= personas)
      .sort((a, b) => {
        const capacidadA = a.reduce((total, mesa) => total + mesa.capacidad, 0);
        const capacidadB = b.reduce((total, mesa) => total + mesa.capacidad, 0);
        return capacidadA - capacidadB;
      });
    if (opciones.length > 0) return opciones[0].map((mesa) => mesa.id);
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
  const duracion = personas <= 2 ? config.duracion_1_2_min : (personas <= 4 ? config.duracion_3_4_min : config.duracion_5_6_min);
  const inicio = servicio === "comida" ? config.comida_inicio : config.cena_inicio;
  const fin = servicio === "comida" ? config.comida_fin : config.cena_fin;
  const slots = generarSlots(inicio, fin, config.intervalo_min);
  return slots.map((hora) => ({
    hora,
    disponible: asignarMesa(mesas, reservas, fecha, hora, duracion, personas, config) !== null,
  }));
}
