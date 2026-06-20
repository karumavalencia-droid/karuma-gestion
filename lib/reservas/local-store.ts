// ─── Karuma Reservas — localStorage engine ────────────────────────────────────
// Keys: karuma_reservas_v1 / karuma_clientes_v1 / karuma_tables_v1

export const RESERVAS_KEY  = "karuma_reservas_v1";
export const CLIENTES_KEY  = "karuma_clientes_v1";
export const TABLES_KEY    = "karuma_tables_v1";
export const MAX_DIAS      = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EstadoLocal =
  | "pendiente"
  | "confirmada"
  | "sentada"
  | "walkin"
  | "no-show"
  | "cancelada";

export type ServicioLocal = "comida" | "cena";

export interface MesaLocal {
  id: string;       // 'T1'..'T21'
  numero: number;
  capacidad: number;
  zona: string;
}

export interface ReservaLocal {
  id: string;
  fecha: string;         // YYYY-MM-DD
  hora: string;          // HH:MM
  servicio: ServicioLocal;
  personas: number;
  mesaIds: string[];     // ['T7']
  nombre: string;
  telefono: string;
  notas: string;
  estado: EstadoLocal;
  origen: "manual" | "walkin";
  creadoEn: string;
}

export interface ClienteLocal {
  id: string;
  nombre: string;
  telefono: string;
  visitas: number;
  ultimaVisita: string;
  totalPersonas: number;
  notas: string;
}

export interface StatsLocal {
  reservasHoy: number;
  paxHoy: number;
  walkInsHoy: number;
  sentadasHoy: number;
  noShowsHoy: number;
  canceladasHoy: number;
  mesasOcupadas: number;
  mesasTotal: number;
  proximaHora: string;
  proximaNombre: string;
}

// ─── Mesas seed ───────────────────────────────────────────────────────────────

export const MESAS_SEED: MesaLocal[] = [
  { id: "T1",  numero: 1,  capacidad: 2, zona: "Interior" },
  { id: "T2",  numero: 2,  capacidad: 2, zona: "Interior" },
  { id: "T3",  numero: 3,  capacidad: 2, zona: "Interior" },
  { id: "T4",  numero: 4,  capacidad: 2, zona: "Interior" },
  { id: "T5",  numero: 5,  capacidad: 2, zona: "Interior" },
  { id: "T6",  numero: 6,  capacidad: 2, zona: "Interior" },
  { id: "T7",  numero: 7,  capacidad: 4, zona: "Interior" },
  { id: "T8",  numero: 8,  capacidad: 2, zona: "Interior" },
  { id: "T9",  numero: 9,  capacidad: 2, zona: "Interior" },
  { id: "T10", numero: 10, capacidad: 2, zona: "Interior" },
  { id: "T11", numero: 11, capacidad: 2, zona: "Interior" },
  { id: "T12", numero: 12, capacidad: 2, zona: "Interior" },
  { id: "T13", numero: 13, capacidad: 4, zona: "Terraza"  },
  { id: "T14", numero: 14, capacidad: 4, zona: "Terraza"  },
  { id: "T15", numero: 15, capacidad: 4, zona: "Terraza"  },
  { id: "T16", numero: 16, capacidad: 4, zona: "Terraza"  },
  { id: "T17", numero: 17, capacidad: 4, zona: "Privado"  },
  { id: "T18", numero: 18, capacidad: 2, zona: "Privado"  },
  { id: "T19", numero: 19, capacidad: 4, zona: "Privado"  },
  { id: "T20", numero: 20, capacidad: 2, zona: "Privado"  },
  { id: "T21", numero: 21, capacidad: 2, zona: "Privado"  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}
function write(key: string, value: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

export function loadMesas(): MesaLocal[] {
  const stored = read<MesaLocal[] | null>(TABLES_KEY, null);
  if (!stored || stored.length === 0) { write(TABLES_KEY, MESAS_SEED); return MESAS_SEED; }
  return stored;
}

export function loadReservas(): ReservaLocal[] {
  return read<ReservaLocal[]>(RESERVAS_KEY, []);
}
export function saveReservas(data: ReservaLocal[]) { write(RESERVAS_KEY, data); }

export function loadClientes(): ClienteLocal[] {
  return read<ClienteLocal[]>(CLIENTES_KEY, []);
}
export function saveClientes(data: ClienteLocal[]) { write(CLIENTES_KEY, data); }

// ─── Table assignment ─────────────────────────────────────────────────────────

function toMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function ocupadasEn(fecha: string, hora: string, servicio: string, excludeId?: string): Set<string> {
  const min = toMin(hora);
  const taken = new Set<string>();
  for (const r of loadReservas()) {
    if (r.id === excludeId) continue;
    if (r.fecha !== fecha || r.servicio !== servicio) continue;
    if (r.estado === "cancelada" || r.estado === "no-show") continue;
    if (Math.abs(toMin(r.hora) - min) < 90) r.mesaIds.forEach((id) => taken.add(id));
  }
  return taken;
}

export function asignarMesa(
  personas: number,
  fecha: string,
  hora: string,
  servicio: string,
  excludeId?: string,
): string[] | null {
  const taken = ocupadasEn(fecha, hora, servicio, excludeId);
  const disponibles = loadMesas()
    .filter((m) => !taken.has(m.id) && m.capacidad >= personas)
    .sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero);
  if (!disponibles.length) return null;
  return [disponibles[0].id];
}

// ─── Mesa label helper ────────────────────────────────────────────────────────

export function mesaLabel(mesaIds: string[]): string {
  if (!mesaIds.length) return "—";
  const mesas = loadMesas();
  return mesaIds
    .map((id) => {
      const m = mesas.find((x) => x.id === id);
      return m ? `Mesa ${m.numero}` : id;
    })
    .join(", ");
}

// ─── Upsert cliente ───────────────────────────────────────────────────────────

export function upsertCliente(nombre: string, telefono: string, fecha: string, personas: number) {
  const clientes = loadClientes();
  const tel = telefono.trim();
  const idx = tel ? clientes.findIndex((c) => c.telefono === tel) : -1;
  if (idx >= 0) {
    clientes[idx] = {
      ...clientes[idx],
      nombre: nombre.trim() || clientes[idx].nombre,
      visitas: clientes[idx].visitas + 1,
      ultimaVisita: fecha,
      totalPersonas: clientes[idx].totalPersonas + personas,
    };
  } else {
    clientes.push({
      id: crypto.randomUUID(),
      nombre: nombre.trim() || "Sin nombre",
      telefono: tel,
      visitas: 1,
      ultimaVisita: fecha,
      totalPersonas: personas,
      notas: "",
    });
  }
  saveClientes(clientes);
}

// ─── Create reserva ───────────────────────────────────────────────────────────

export interface CreateReservaInput {
  fecha: string;
  hora: string;
  servicio: ServicioLocal;
  personas: number;
  nombre: string;
  telefono: string;
  notas: string;
  origen: "manual" | "walkin";
}

export function createReserva(
  input: CreateReservaInput,
): { ok: true; reserva: ReservaLocal } | { ok: false; error: string } {
  // Validate max 7 days
  const hoy = new Date().toISOString().split("T")[0];
  const max = new Date();
  max.setDate(max.getDate() + MAX_DIAS);
  if (input.fecha < hoy) return { ok: false, error: "No se puede reservar en fechas pasadas." };
  if (input.fecha > max.toISOString().split("T")[0])
    return { ok: false, error: `Solo se puede reservar con un máximo de ${MAX_DIAS} días de antelación.` };

  const mesaIds = asignarMesa(input.personas, input.fecha, input.hora, input.servicio);
  if (!mesaIds) return { ok: false, error: "No hay mesas disponibles para ese horario y número de personas." };

  const reserva: ReservaLocal = {
    id: crypto.randomUUID(),
    fecha: input.fecha,
    hora: input.hora,
    servicio: input.servicio,
    personas: input.personas,
    mesaIds,
    nombre: input.nombre.trim() || "Sin nombre",
    telefono: input.telefono.trim(),
    notas: input.notas.trim(),
    estado: input.origen === "walkin" ? "walkin" : "confirmada",
    origen: input.origen,
    creadoEn: new Date().toISOString(),
  };

  const reservas = loadReservas();
  reservas.push(reserva);
  saveReservas(reservas);

  upsertCliente(input.nombre, input.telefono, input.fecha, input.personas);

  return { ok: true, reserva };
}

// ─── Update / delete ──────────────────────────────────────────────────────────

export function updateEstado(id: string, estado: EstadoLocal) {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], estado }; saveReservas(list); }
}

export function deleteReserva(id: string) {
  saveReservas(loadReservas().filter((r) => r.id !== id));
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function getDashboardStats(fecha: string): StatsLocal {
  const all = loadReservas().filter((r) => r.fecha === fecha);
  const ahora = new Date().toTimeString().slice(0, 5);

  const activas = all.filter((r) => r.estado !== "cancelada" && r.estado !== "no-show");
  const sentadas = all.filter((r) => r.estado === "sentada" || r.estado === "walkin");

  const mesasOc = new Set<string>();
  sentadas.forEach((r) => r.mesaIds.forEach((id) => mesasOc.add(id)));

  const proximas = activas
    .filter((r) => r.hora > ahora && (r.estado === "pendiente" || r.estado === "confirmada"))
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const proxima = proximas[0];

  return {
    reservasHoy: activas.length,
    paxHoy: activas.reduce((s, r) => s + r.personas, 0),
    walkInsHoy: all.filter((r) => r.estado === "walkin").length,
    sentadasHoy: sentadas.length,
    noShowsHoy: all.filter((r) => r.estado === "no-show").length,
    canceladasHoy: all.filter((r) => r.estado === "cancelada").length,
    mesasOcupadas: mesasOc.size,
    mesasTotal: loadMesas().length,
    proximaHora: proxima?.hora ?? "—",
    proximaNombre: proxima?.nombre ?? "—",
  };
}
