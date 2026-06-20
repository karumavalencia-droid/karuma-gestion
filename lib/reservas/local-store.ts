// ─── Karuma Reservas — localStorage engine v2 ────────────────────────────────
// Keys: karuma_reservas_v1 / karuma_clientes_v1 / karuma_tables_v1

export const RESERVAS_KEY = "karuma_reservas_v1";
export const CLIENTES_KEY = "karuma_clientes_v1";
export const TABLES_KEY   = "karuma_tables_v1";
export const HORARIO_KEY  = "karuma_horario_v1";
export const MAX_DIAS     = 7;

// 0=domingo, 1=lunes … 6=sábado
export interface HorarioConfig {
  diasAbiertos: number[]; // días en que el restaurante abre
}
const HORARIO_DEFAULT: HorarioConfig = { diasAbiertos: [0, 1, 2, 3, 4, 5, 6] };

export function loadHorario(): HorarioConfig {
  return read<HorarioConfig>(HORARIO_KEY, HORARIO_DEFAULT);
}
export function saveHorario(h: HorarioConfig) { write(HORARIO_KEY, h); }

// ─── Types ────────────────────────────────────────────────────────────────────

export type EstadoLocal =
  | "pendiente"
  | "confirmada"
  | "sentada"
  | "walkin"
  | "finished"
  | "no-show"
  | "cancelada";

export type MesaStatus = "available" | "reserved" | "occupied" | "cleaning";
export type ServicioLocal = "comida" | "cena";
export type TipoReserva = "reservation" | "walk_in";

export interface MesaLocal {
  id: string;       // 'T1'..'T21'
  numero: number;
  capacidad: number;
  zona: string;
}

export interface ReservaLocal {
  id: string;
  type: TipoReserva;
  fecha: string;         // YYYY-MM-DD
  hora: string;          // HH:MM
  servicio: ServicioLocal;
  personas: number;
  mesaIds: string[];     // e.g. ['T7'] or ['T3','T4']
  nombre: string;
  telefono: string;
  notas: string;
  estado: EstadoLocal;
  creadoEn: string;
  seatedAt?: string;     // ISO when seated
  finishedAt?: string;   // ISO when finished
}

export interface MesaConEstado extends MesaLocal {
  status: MesaStatus;
  reserva?: ReservaLocal;
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
  { id: "T19", numero: 19, capacidad: 2, zona: "Privado"  },
  { id: "T20", numero: 20, capacidad: 4, zona: "Privado"  },
  { id: "T28", numero: 28, capacidad: 2, zona: "Privado"  },
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

// ─── Mesa status computation ──────────────────────────────────────────────────

function isActive(r: ReservaLocal): boolean {
  return r.estado !== "cancelada" && r.estado !== "no-show" && r.estado !== "finished";
}
function isOccupied(r: ReservaLocal): boolean {
  return r.estado === "sentada" || r.estado === "walkin";
}
function isReserved(r: ReservaLocal): boolean {
  return r.estado === "confirmada" || r.estado === "pendiente";
}

export function getMesasConEstado(fecha: string, servicio: string): MesaConEstado[] {
  const mesas = loadMesas();
  const reservas = loadReservas().filter(
    (r) => r.fecha === fecha && r.servicio === servicio && isActive(r),
  );
  return mesas.map((m) => {
    const occ = reservas.find((r) => isOccupied(r) && r.mesaIds.includes(m.id));
    if (occ) return { ...m, status: "occupied" as MesaStatus, reserva: occ };
    const res = reservas.find((r) => isReserved(r) && r.mesaIds.includes(m.id));
    if (res) return { ...m, status: "reserved" as MesaStatus, reserva: res };
    return { ...m, status: "available" as MesaStatus };
  });
}

// ─── Table assignment ─────────────────────────────────────────────────────────

function toMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function ocupadasEn(
  fecha: string, hora: string, servicio: string, excludeId?: string,
): Set<string> {
  const min = toMin(hora);
  const taken = new Set<string>();
  for (const r of loadReservas()) {
    if (r.id === excludeId || !isActive(r)) continue;
    if (r.fecha !== fecha || r.servicio !== servicio) continue;
    if (Math.abs(toMin(r.hora) - min) < 90) r.mesaIds.forEach((id) => taken.add(id));
  }
  return taken;
}

export function asignarMesa(
  personas: number, fecha: string, hora: string, servicio: string, excludeId?: string,
): string[] | null {
  const taken = ocupadasEn(fecha, hora, servicio, excludeId);
  const avail = loadMesas()
    .filter((m) => !taken.has(m.id) && m.capacidad >= personas)
    .sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero);
  return avail.length ? [avail[0].id] : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function mesaLabel(mesaIds: string[]): string {
  if (!mesaIds.length) return "—";
  const mesas = loadMesas();
  return mesaIds
    .map((id) => { const m = mesas.find((x) => x.id === id); return m ? `T${m.numero}` : id; })
    .join(" + ");
}

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

// ─── Create reservation ───────────────────────────────────────────────────────

export interface CreateReservaInput {
  fecha: string; hora: string; servicio: ServicioLocal;
  personas: number; nombre: string; telefono: string;
  notas: string; origen: "manual" | "walkin";
  forceMesaIds?: string[];  // bypass auto-assign
}

export function createReserva(
  input: CreateReservaInput,
): { ok: true; reserva: ReservaLocal } | { ok: false; error: string } {
  const hoy = new Date().toISOString().split("T")[0];
  const max = new Date(); max.setDate(max.getDate() + MAX_DIAS);
  if (input.fecha < hoy) return { ok: false, error: "No se puede reservar en fechas pasadas." };
  if (input.fecha > max.toISOString().split("T")[0])
    return { ok: false, error: `Máximo ${MAX_DIAS} días de antelación.` };

  let mesaIds: string[];
  if (input.forceMesaIds && input.forceMesaIds.length) {
    mesaIds = input.forceMesaIds;
  } else {
    const assigned = asignarMesa(input.personas, input.fecha, input.hora, input.servicio);
    if (!assigned) return { ok: false, error: "No hay mesas disponibles para ese horario y número de personas." };
    mesaIds = assigned;
  }

  const now = new Date().toISOString();
  const isWalkIn = input.origen === "walkin";
  const reserva: ReservaLocal = {
    id: crypto.randomUUID(),
    type: isWalkIn ? "walk_in" : "reservation",
    fecha: input.fecha, hora: input.hora, servicio: input.servicio,
    personas: input.personas, mesaIds,
    nombre: input.nombre.trim() || "Sin nombre",
    telefono: input.telefono.trim(),
    notas: input.notas.trim(),
    estado: isWalkIn ? "walkin" : "confirmada",
    creadoEn: now,
    seatedAt: isWalkIn ? now : undefined,
  };

  const list = loadReservas();
  list.push(reserva);
  saveReservas(list);
  upsertCliente(input.nombre, input.telefono, input.fecha, input.personas);
  return { ok: true, reserva };
}

// ─── Create walk-in for a specific mesa ──────────────────────────────────────

export function createWalkInForMesa(
  mesaId: string, personas: number, nombre: string, telefono: string, notas: string,
): { ok: true; reserva: ReservaLocal } | { ok: false; error: string } {
  // Check mesa is not currently occupied
  const hoy = new Date().toISOString().split("T")[0];
  const hora = new Date().toTimeString().slice(0, 5);
  const servicio: ServicioLocal = new Date().getHours() >= 17 ? "cena" : "comida";

  const activas = loadReservas().filter(
    (r) => r.fecha === hoy && r.servicio === servicio && isActive(r) &&
            isOccupied(r) && r.mesaIds.includes(mesaId),
  );
  if (activas.length) return { ok: false, error: "Esta mesa ya está ocupada." };

  return createReserva({
    fecha: hoy, hora, servicio, personas,
    nombre, telefono, notas,
    origen: "walkin", forceMesaIds: [mesaId],
  });
}

// ─── Seat a reservation ───────────────────────────────────────────────────────

export function sentarReserva(
  reservaId: string,
  forceMesaIds?: string[],
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === reservaId);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };

  const r = list[idx];
  let mesaIds = r.mesaIds;

  if (forceMesaIds && forceMesaIds.length) {
    mesaIds = forceMesaIds;
  } else if (!mesaIds.length) {
    const assigned = asignarMesa(r.personas, r.fecha, r.hora, r.servicio, reservaId);
    if (!assigned) return { ok: false, error: "No hay mesas disponibles." };
    mesaIds = assigned;
  }

  list[idx] = { ...r, estado: "sentada", mesaIds, seatedAt: new Date().toISOString() };
  saveReservas(list);
  return { ok: true };
}

// ─── Liberar mesa (finish) ────────────────────────────────────────────────────

export function liberarMesa(reservaId: string): void {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === reservaId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], estado: "finished", finishedAt: new Date().toISOString() };
    saveReservas(list);
  }
}

// ─── Change mesas ─────────────────────────────────────────────────────────────

export function cambiarMesas(
  reservaId: string,
  newMesaIds: string[],
): { ok: true } | { ok: false; error: string } {
  if (!newMesaIds.length) return { ok: false, error: "Selecciona al menos una mesa." };
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === reservaId);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };
  list[idx] = { ...list[idx], mesaIds: newMesaIds };
  saveReservas(list);
  return { ok: true };
}

// ─── Update estado ────────────────────────────────────────────────────────────

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
    walkInsHoy: all.filter((r) => r.type === "walk_in").length,
    sentadasHoy: sentadas.length,
    noShowsHoy: all.filter((r) => r.estado === "no-show").length,
    canceladasHoy: all.filter((r) => r.estado === "cancelada").length,
    mesasOcupadas: mesasOc.size,
    mesasTotal: loadMesas().length,
    proximaHora: proxima?.hora ?? "—",
    proximaNombre: proxima?.nombre ?? "—",
  };
}
