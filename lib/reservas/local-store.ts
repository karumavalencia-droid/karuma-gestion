// ─── Karuma Reservas — localStorage engine v2 ────────────────────────────────
// Keys: karuma_reservas_v1 / karuma_clientes_v1 / karuma_tables_v1

export const RESERVAS_KEY = "karuma_reservas_v1";
export const CLIENTES_KEY = "karuma_clientes_v1";
export const TABLES_KEY   = "karuma_tables_v2";
export const HORARIO_KEY  = "karuma_horario_v1";
export const ESPERA_KEY   = "karuma_espera_v1";
export const MAX_DIAS     = 7;

export type CanalLocal = "google" | "instagram" | "telefono" | "web" | "presencial" | "otro";

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
  | "llegada"
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
  origen?: "online" | "telefono" | "walkin" | "manual";
  canal?: CanalLocal;    // captación: google, instagram, etc.
  seatedAt?: string;
  finishedAt?: string;
}

export interface EsperaLocal {
  id: string;
  fecha: string;
  nombre: string;
  telefono: string;
  personas: number;
  notas: string;
  creadoEn: string;
  servicio: ServicioLocal;
  estado: "esperando" | "sentado" | "cancelado";
}

export interface MesaConEstado extends MesaLocal {
  status: MesaStatus;
  reserva?: ReservaLocal;
}

export type EtiquetaLocal = "vip" | "alergico" | "cumpleanos" | "regular" | "problematico";

export interface ClienteLocal {
  id: string;
  nombre: string;
  telefono: string;
  visitas: number;
  ultimaVisita: string;
  totalPersonas: number;
  notas: string;
  etiquetas?: EtiquetaLocal[];
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
  { id: "T13", numero: 13, capacidad: 4, zona: "Interior" },
  { id: "T14", numero: 14, capacidad: 4, zona: "Interior" },
  { id: "T15", numero: 15, capacidad: 4, zona: "Interior" },
  { id: "T16", numero: 16, capacidad: 4, zona: "Interior" },
  { id: "T17", numero: 17, capacidad: 4, zona: "Interior" },
  { id: "T18", numero: 18, capacidad: 2, zona: "Interior" },
  { id: "T19", numero: 19, capacidad: 2, zona: "Interior" },
  { id: "T20", numero: 20, capacidad: 4, zona: "Interior" },
  { id: "T28", numero: 28, capacidad: 2, zona: "Interior" },
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

export function loadEspera(): EsperaLocal[] {
  return read<EsperaLocal[]>(ESPERA_KEY, []);
}
export function saveEspera(data: EsperaLocal[]) { write(ESPERA_KEY, data); }

export function addEspera(
  fecha: string, servicio: ServicioLocal,
  nombre: string, telefono: string, personas: number, notas: string,
): EsperaLocal {
  const entry: EsperaLocal = {
    id: crypto.randomUUID(), fecha, servicio, nombre, telefono,
    personas, notas, creadoEn: new Date().toISOString(), estado: "esperando",
  };
  const list = loadEspera();
  list.push(entry);
  saveEspera(list);
  return entry;
}

export function updateEspera(id: string, estado: EsperaLocal["estado"]) {
  const list = loadEspera();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], estado }; saveEspera(list); }
}

export function getVisitasCliente(telefono: string): number {
  if (!telefono.trim()) return 0;
  const c = loadClientes().find((c) => c.telefono === telefono.trim());
  return c?.visitas ?? 0;
}

// ─── Mesa status computation ──────────────────────────────────────────────────

function isActive(r: ReservaLocal): boolean {
  return r.estado !== "cancelada" && r.estado !== "no-show" && r.estado !== "finished";
}
function isOccupied(r: ReservaLocal): boolean {
  return r.estado === "sentada" || r.estado === "walkin";
}
function isReserved(r: ReservaLocal): boolean {
  return r.estado === "confirmada" || r.estado === "pendiente" || r.estado === "llegada";
}

// ─── Turno / 翻台 (table turn-over) ─────────────────────────────────────────────
// Cuánto tiempo ocupa una mesa una reserva, según el tamaño del grupo.
// Debe coincidir con reservas_config (duracion_1_2_min / duracion_3_4_min).
export const DURACION_1_2_MIN = 90;   // 1-2 personas → 90 min
export const DURACION_3_4_MIN = 120;  // 3+ personas  → 120 min
export function duracionReserva(personas: number): number {
  return personas <= 2 ? DURACION_1_2_MIN : DURACION_3_4_MIN;
}
// ¿La reserva ocupa físicamente la mesa en el minuto `tMin`?  Ventana [hora, hora+turno)
function cubreMomento(r: ReservaLocal, tMin: number): boolean {
  const ini = toMin(r.hora);
  return tMin >= ini && tMin < ini + duracionReserva(r.personas);
}

// Ventanas de servicio para el visor del plano por horas. El local abre cena a las 19:30.
export const SERVICIO_VENTANA: Record<ServicioLocal, { inicio: string; fin: string }> = {
  comida: { inicio: "13:00", fin: "16:00" },
  cena:   { inicio: "19:30", fin: "23:00" },
};
// Horas del selector del plano, en pasos de 30 min.
export function slotsPlano(servicio: ServicioLocal): string[] {
  const { inicio, fin } = SERVICIO_VENTANA[servicio];
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fin.split(":").map(Number);
  const out: string[] = [];
  for (let t = hI * 60 + mI; t <= hF * 60 + mF; t += 30) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}
// Hora por defecto del plano: "ahora" si es hoy y dentro del servicio; si no, la apertura.
export function defaultHoraPlano(fecha: string, servicio: ServicioLocal): string {
  const slots = slotsPlano(servicio);
  const hoyStr = new Date().toISOString().split("T")[0];
  if (fecha === hoyStr) {
    const now = new Date().toTimeString().slice(0, 5);
    const previos = slots.filter((s) => s <= now);
    if (previos.length && now <= slots[slots.length - 1]) return previos[previos.length - 1];
  }
  return slots[0];
}

export function getMesasConEstado(
  fecha: string, servicio: string,
  hora?: string,                    // si se pasa, estado "en ese momento" (翻台); si no, todo el servicio
  extra: ReservaLocal[] = [],
): MesaConEstado[] {
  const mesas = loadMesas();
  const tMin = hora ? toMin(hora) : null;
  const enMomento = (r: ReservaLocal) => tMin === null || cubreMomento(r, tMin);
  const reservas = [
    ...loadReservas().filter((r) => r.fecha === fecha && r.servicio === servicio && isActive(r)),
    ...extra.filter((r) => r.fecha === fecha && r.servicio === servicio && isActive(r)),
  ].filter(enMomento);
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
  fecha: string, hora: string, servicio: string, personas: number, excludeId?: string,
): Set<string> {
  const nuevaIni = toMin(hora);
  const nuevaFin = nuevaIni + duracionReserva(personas);
  const taken = new Set<string>();
  for (const r of loadReservas()) {
    if (r.id === excludeId || !isActive(r)) continue;
    if (r.fecha !== fecha || r.servicio !== servicio) continue;
    const ini = toMin(r.hora);
    const fin = ini + duracionReserva(r.personas);
    // Solapan [nuevaIni,nuevaFin) ∩ [ini,fin) ≠ ∅  → la mesa no está libre en ese turno
    if (nuevaIni < fin && ini < nuevaFin) r.mesaIds.forEach((id) => taken.add(id));
  }
  return taken;
}

export function asignarMesa(
  personas: number, fecha: string, hora: string, servicio: string, excludeId?: string,
): string[] | null {
  const taken = ocupadasEn(fecha, hora, servicio, personas, excludeId);
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
  canal?: CanalLocal;
  forceMesaIds?: string[];
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
    canal: input.canal,
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

export function desplazarReserva(
  id: string, nuevaHora: string, nuevaFecha?: string,
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };
  list[idx] = { ...list[idx], hora: nuevaHora, ...(nuevaFecha ? { fecha: nuevaFecha } : {}) };
  saveReservas(list);
  return { ok: true };
}

// Edita datos básicos de una reserva (personas y/o hora) sin cambiar su estado.
export function editReserva(
  id: string, cambios: { personas?: number; hora?: string },
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };
  const limpio: Partial<ReservaLocal> = {};
  if (typeof cambios.personas === "number" && cambios.personas > 0) limpio.personas = cambios.personas;
  if (cambios.hora && cambios.hora.length >= 4) limpio.hora = cambios.hora;
  list[idx] = { ...list[idx], ...limpio };
  saveReservas(list);
  return { ok: true };
}

export function updateEtiquetasCliente(telefono: string, etiquetas: EtiquetaLocal[]) {
  const list = loadClientes();
  const idx = list.findIndex((c) => c.telefono === telefono.trim());
  if (idx >= 0) { list[idx] = { ...list[idx], etiquetas }; saveClientes(list); }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  porCanal: Record<string, number>;
  porDiaSemana: number[];     // 0=Dom…6=Sab
  porHora: Record<string, number>;
  topClientes: { nombre: string; telefono: string; visitas: number }[];
  tasaCancelacion: number;    // 0-1
  tasaNoShow: number;
  paxPromedio: number;
  totalReservas: number;
  totalPax: number;
}

export function getAnalytics(diasAtras = 30): AnalyticsData {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasAtras);
  const desdeStr = desde.toISOString().split("T")[0];

  const todas = loadReservas().filter((r) => r.fecha >= desdeStr);
  const activas = todas.filter((r) => r.estado !== "cancelada" && r.estado !== "no-show");
  const canceladas = todas.filter((r) => r.estado === "cancelada").length;
  const noShows = todas.filter((r) => r.estado === "no-show").length;

  const porCanal: Record<string, number> = {};
  for (const r of todas) {
    const c = r.canal ?? (r.origen === "online" ? "web" : "telefono");
    porCanal[c] = (porCanal[c] ?? 0) + 1;
  }

  const porDiaSemana = [0, 0, 0, 0, 0, 0, 0];
  for (const r of activas) {
    const dia = new Date(r.fecha + "T12:00:00").getDay();
    porDiaSemana[dia]++;
  }

  const porHora: Record<string, number> = {};
  for (const r of activas) {
    const h = r.hora.slice(0, 5);
    porHora[h] = (porHora[h] ?? 0) + 1;
  }

  const clientes = loadClientes()
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, 5)
    .map(({ nombre, telefono, visitas }) => ({ nombre, telefono, visitas }));

  const totalPax = activas.reduce((s, r) => s + r.personas, 0);

  return {
    porCanal,
    porDiaSemana,
    porHora,
    topClientes: clientes,
    tasaCancelacion: todas.length ? canceladas / todas.length : 0,
    tasaNoShow: todas.length ? noShows / todas.length : 0,
    paxPromedio: activas.length ? totalPax / activas.length : 0,
    totalReservas: activas.length,
    totalPax,
  };
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
