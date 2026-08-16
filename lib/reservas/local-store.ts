// ─── Karuma Reservas — localStorage engine v2 ────────────────────────────────
// Keys: karuma_reservas_v1 / karuma_clientes_v1 / karuma_tables_v1
import {
  buildTableBlockNotes,
  canMoveReservation,
  isActiveReservation,
  isTableBlockReservation,
  stripTableBlockNotes,
} from "@/lib/reservas/helpers";

export const RESERVAS_KEY = "karuma_reservas_v1";
export const CLIENTES_KEY = "karuma_clientes_v1";
export const TABLES_KEY   = "karuma_tables_v4"; // v4: 21 mesas (vuelve T28), zonas Terraza/Privado
export const HORARIO_KEY  = "karuma_horario_v1";
export const ESPERA_KEY   = "karuma_espera_v1";
export const RESERVAS_CONFIG_KEY = "karuma_reservas_config_v1";
export const MAX_DIAS     = 7;
export const SLOT_INTERVAL_MIN = 15;

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
export type TipoReserva = "reservation" | "walk_in" | "table_block";

export interface MesaLocal {
  id: string;       // 'T1'..'T20' + 'T28'
  numero: number;
  capacidad: number;
  zona: string;
}

export interface ReservaLocal {
  id: string;
  type: TipoReserva;
  fecha: string;         // YYYY-MM-DD
  hora: string;          // HH:MM
  duracionMin?: number;
  servicio: ServicioLocal;
  personas: number;
  mesaIds: string[];     // e.g. ['T7'] or ['T3','T4']
  nombre: string;
  telefono: string;
  email?: string | null;
  notas: string;
  estado: EstadoLocal;
  creadoEn: string;
  origen?: "online" | "telefono" | "walkin" | "manual";
  canal?: CanalLocal;    // captación: google, instagram, etc.
  confirmationEmailSentAt?: string | null;
  reviewEmailSentAt?: string | null;
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
  reserva?: ReservaLocal;            // la reserva activa en el momento mostrado (horaPlano)
  agenda?: ReservaLocal[];           // TODAS las reservas de esa mesa ese día+servicio (varios turnos), ordenadas por hora
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
  { id: "T13", numero: 13, capacidad: 4, zona: "Terraza" },
  { id: "T14", numero: 14, capacidad: 4, zona: "Terraza" },
  { id: "T15", numero: 15, capacidad: 4, zona: "Terraza" },
  { id: "T16", numero: 16, capacidad: 4, zona: "Terraza" },
  { id: "T17", numero: 17, capacidad: 4, zona: "Privado" },
  { id: "T18", numero: 18, capacidad: 2, zona: "Privado" },
  { id: "T19", numero: 19, capacidad: 2, zona: "Privado" },
  { id: "T20", numero: 20, capacidad: 4, zona: "Privado" },
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

export function storeCreatedReservation(input: {
  id: string;
  fecha: string;
  hora: string;
  servicio: ServicioLocal;
  personas: number;
  mesaIds: string[];
  nombre: string;
  telefono?: string;
  email?: string | null;
  notas?: string;
  origen: NonNullable<ReservaLocal["origen"]>;
  duracionMin?: number;
  bloqueo?: boolean;
  confirmationEmailSentAt?: string | null;
}): ReservaLocal {
  const now = new Date().toISOString();
  const reserva: ReservaLocal = {
    id: input.id,
    type: input.bloqueo ? "table_block" : input.origen === "walkin" ? "walk_in" : "reservation",
    fecha: input.fecha,
    hora: input.hora.slice(0, 5),
    duracionMin: input.duracionMin,
    servicio: input.servicio,
    personas: input.bloqueo ? 0 : input.personas,
    mesaIds: input.mesaIds,
    nombre: input.bloqueo ? "Bloqueo mesa" : input.nombre,
    telefono: input.telefono ?? "",
    email: input.email ?? null,
    notas: input.notas ?? "",
    estado: input.origen === "walkin" ? "walkin" : "confirmada",
    creadoEn: now,
    origen: input.origen,
    confirmationEmailSentAt: input.confirmationEmailSentAt ?? null,
    seatedAt: input.origen === "walkin" ? now : undefined,
  };
  const list = loadReservas();
  const existing = list.findIndex((item) => item.id === reserva.id);
  if (existing >= 0) list[existing] = reserva;
  else list.push(reserva);
  saveReservas(list);
  return reserva;
}

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
  return isActiveReservation(r.estado);
}
function isOccupied(r: ReservaLocal): boolean {
  return r.estado === "sentada" || r.estado === "walkin";
}
function isReserved(r: ReservaLocal): boolean {
  return r.estado === "confirmada" || r.estado === "pendiente" || r.estado === "llegada";
}

// ─── Turno / rotación de mesas ────────────────────────────────────────────────
// Cuánto tiempo ocupa una mesa una reserva, según el tamaño del grupo.
// Debe coincidir con reservas_config (duracion_1_2_min / duracion_3_4_min / duracion_5_6_min).
export const DURACION_1_2_MIN = 90;   // 1-2 personas → 90 min
export const DURACION_3_4_MIN = 120;  // 3-4 personas → 120 min
export const DURACION_5_6_MIN = 150;  // 5-6 personas → 150 min
const MESA_NO_DISPONIBLE_ERROR =
  "Esta mesa no está disponible: cada reserva bloquea la mesa al menos 1h30.";

export function duracionReserva(personas: number): number {
  return personas <= 2 ? DURACION_1_2_MIN : (personas <= 4 ? DURACION_3_4_MIN : DURACION_5_6_MIN);
}
function duracionReservaLocal(r: ReservaLocal): number {
  return r.duracionMin ?? duracionReserva(r.personas);
}
// Inicio efectivo de la ventana de una reserva. Una sentada/walk-in ya está
// físicamente en la mesa: cuenta desde que se sentó (seatedAt, por si se sentó
// antes de su hora), redondeado a su franja para que el plano la muestre
// ocupada en la franja "Ahora" (un walk-in de las 19:52 ocupa desde las 19:45).
function iniVentana(r: ReservaLocal): number {
  let ini = toMin(r.hora);
  if (!isOccupied(r)) return ini;
  if (r.seatedAt) {
    const seated = new Date(r.seatedAt);
    if (seated.toISOString().split("T")[0] === r.fecha) {
      ini = Math.min(ini, seated.getHours() * 60 + seated.getMinutes());
    }
  }
  return Math.floor(ini / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
}
// Fin efectivo de la ventana de una reserva. Para una sentada/walk-in de hoy,
// la mesa sigue ocupada hasta que se libera aunque haya pasado su ventana
// teórica: el fin nunca queda por detrás de "ahora" (+ un slot de margen).
function finVentana(r: ReservaLocal): number {
  const fin = toMin(r.hora) + duracionReservaLocal(r);
  if (!isOccupied(r) || r.fecha !== new Date().toISOString().split("T")[0]) return fin;
  const ahora = new Date();
  return Math.max(fin, ahora.getHours() * 60 + ahora.getMinutes() + SLOT_INTERVAL_MIN);
}
// ¿La reserva ocupa físicamente la mesa en el minuto `tMin`?  Ventana [ini, fin)
function cubreMomento(r: ReservaLocal, tMin: number): boolean {
  return tMin >= iniVentana(r) && tMin < finVentana(r);
}
function mesaConGrupo(mesa: MesaLocal, reserva?: ReservaLocal): MesaLocal {
  if (!reserva || reserva.mesaIds.length <= 1 || isTableBlockReservation(reserva)) return mesa;
  return {
    ...mesa,
    capacidad: reserva.personas,
    zona: `${mesa.zona} · ${mesaLabel(reserva.mesaIds)}`,
  };
}

// Ventanas de servicio para el visor del plano por horas. El local abre cena a las 19:30.
export const SERVICIO_VENTANA: Record<ServicioLocal, { inicio: string; fin: string }> = {
  comida: { inicio: "13:00", fin: "16:00" },
  cena:   { inicio: "19:30", fin: "23:00" },
};

// La operativa cambia automáticamente de comida a cena después de las 16:30.
// Las 16:30 todavía pertenecen a comida; desde las 16:31 se usa cena.
export function servicioParaHora(hora: string): ServicioLocal {
  return toMin(hora) > 16 * 60 + 30 ? "cena" : "comida";
}

export function servicioActual(fecha = new Date()): ServicioLocal {
  const hora = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
  return servicioParaHora(hora);
}

// Horas del selector del plano, en pasos de 15 min.
export function slotsPlano(servicio: ServicioLocal): string[] {
  const { inicio, fin } = SERVICIO_VENTANA[servicio];
  const [hI, mI] = inicio.split(":").map(Number);
  const [hF, mF] = fin.split(":").map(Number);
  const out: string[] = [];
  for (let t = hI * 60 + mI; t <= hF * 60 + mF; t += SLOT_INTERVAL_MIN) {
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
  hora?: string,                    // si se pasa, estado "en ese momento"; si no, todo el servicio
  extra: ReservaLocal[] = [],
): MesaConEstado[] {
  const mesas = loadMesas();
  const tMin = hora ? toMin(hora) : null;
  const enMomento = (r: ReservaLocal) => tMin === null || cubreMomento(r, tMin);
  const delDia = [
    ...loadReservas().filter((r) => r.fecha === fecha && r.servicio === servicio && isActive(r)),
    ...extra.filter((r) => r.fecha === fecha && r.servicio === servicio && isActive(r)),
  ];
  return mesas.map((m) => {
    // Todas las reservas de esta mesa ese día (varios turnos), ordenadas por hora
    const agenda = delDia
      .filter((r) => r.mesaIds.includes(m.id))
      .sort((a, b) => toMin(a.hora) - toMin(b.hora));
    const ahora = agenda.filter(enMomento);
    // Ocupada solo mientras dura la ocupación (finVentana extiende hasta que se
    // libere): en franjas posteriores la mesa vuelve a mostrarse disponible.
    const occ = ahora.find((r) => isOccupied(r));
    const res = ahora.find((r) => isReserved(r));
    const joinedPreview = occ ?? res ?? agenda.find((r) => r.mesaIds.length > 1);
    const mesaVisible = mesaConGrupo(m, joinedPreview);
    if (occ) return { ...mesaVisible, status: "occupied" as MesaStatus, reserva: occ, agenda };
    if (res) return { ...mesaVisible, status: "reserved" as MesaStatus, reserva: res, agenda };
    return { ...mesaVisible, status: "available" as MesaStatus, agenda };
  });
}

// ─── Table assignment ─────────────────────────────────────────────────────────

function toMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function ocupadasEn(
  fecha: string,
  hora: string,
  servicio: string,
  personas: number,
  excludeId?: string,
  duracionMin?: number,
): Set<string> {
  const nuevaIni = toMin(hora);
  const nuevaFin = nuevaIni + (duracionMin ?? duracionReserva(personas));
  const taken = new Set<string>();
  for (const r of loadReservas()) {
    if (r.id === excludeId || !isActive(r)) continue;
    if (r.fecha !== fecha || r.servicio !== servicio) continue;
    // Una sentada/walk-in bloquea hasta que se libere (fin extendido a "ahora"),
    // pero deja la mesa reservable en franjas posteriores del mismo servicio.
    const ini = iniVentana(r);
    const fin = finVentana(r);
    // Solapan [nuevaIni,nuevaFin) ∩ [ini,fin) ≠ ∅  → la mesa no está libre en ese turno
    if (nuevaIni < fin && ini < nuevaFin) r.mesaIds.forEach((id) => taken.add(id));
  }
  return taken;
}

function uniqueMesaIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function validarMesasLibres(
  mesaIds: string[],
  fecha: string,
  hora: string,
  servicio: string,
  personas: number,
  excludeId?: string,
  duracionMin?: number,
  allowOcupadas = false,
): { ok: true; mesaIds: string[] } | { ok: false; error: string } {
  const ids = uniqueMesaIds(mesaIds);
  if (!ids.length) return { ok: false, error: "Selecciona al menos una mesa." };

  const mesas = loadMesas();
  if (ids.some((id) => !mesas.some((m) => m.id === id))) {
    return { ok: false, error: "Una de las mesas seleccionadas no existe." };
  }

  // El cambio manual de mesa permite ocupar mesas no libres (override del admin).
  if (!allowOcupadas) {
    const ocupadas = ocupadasEn(fecha, hora, servicio, personas, excludeId, duracionMin);
    if (ids.some((id) => ocupadas.has(id))) {
      return { ok: false, error: MESA_NO_DISPONIBLE_ERROR };
    }
  }

  return { ok: true, mesaIds: ids };
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

export function mesasDisponiblesParaCambio(reservaId: string): MesaLocal[] {
  const reserva = loadReservas().find((r) => r.id === reservaId);
  if (!reserva) return [];
  if (isTableBlockReservation(reserva) || !canMoveReservation(reserva.estado) || reserva.mesaIds.length === 0) return [];

  // El admin puede mover la reserva a CUALQUIER mesa (también ocupadas): es un
  // cambio manual con criterio. Mostramos todas las mesas salvo la(s) actual(es).
  // El control de aforo se mantiene al guardar.
  return loadMesas()
    .filter((m) => !reserva.mesaIds.includes(m.id))
    .sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero);
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
    const validacion = validarMesasLibres(
      input.forceMesaIds,
      input.fecha,
      input.hora,
      input.servicio,
      input.personas,
    );
    if (!validacion.ok) return { ok: false, error: validacion.error };
    mesaIds = validacion.mesaIds;
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
    origen: input.origen,
    canal: input.canal,
    seatedAt: isWalkIn ? now : undefined,
  };

  const list = loadReservas();
  list.push(reserva);
  saveReservas(list);
  upsertCliente(input.nombre, input.telefono, input.fecha, input.personas);
  return { ok: true, reserva };
}

export interface CreateTableBlockInput {
  fecha: string;
  hora: string;
  servicio: ServicioLocal;
  duracionMin: number;
  mesaIds: string[];
  notas?: string;
}

export function createTableBlock(
  input: CreateTableBlockInput,
): { ok: true; reserva: ReservaLocal } | { ok: false; error: string } {
  const hoy = new Date().toISOString().split("T")[0];
  const max = new Date(); max.setDate(max.getDate() + MAX_DIAS);
  if (input.fecha < hoy) return { ok: false, error: "No se puede bloquear una fecha pasada." };
  if (input.fecha > max.toISOString().split("T")[0])
    return { ok: false, error: `Máximo ${MAX_DIAS} días de antelación.` };

  const duracionMin = Math.max(SLOT_INTERVAL_MIN, Math.min(480, Number(input.duracionMin) || DURACION_1_2_MIN));
  const validacion = validarMesasLibres(input.mesaIds, input.fecha, input.hora, input.servicio, 1, undefined, duracionMin);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const reserva: ReservaLocal = {
    id: crypto.randomUUID(),
    type: "table_block",
    fecha: input.fecha,
    hora: input.hora,
    duracionMin,
    servicio: input.servicio,
    personas: 0,
    mesaIds: validacion.mesaIds,
    nombre: "Bloqueo mesa",
    telefono: "",
    notas: stripTableBlockNotes(buildTableBlockNotes(input.notas)),
    estado: "confirmada",
    creadoEn: new Date().toISOString(),
    origen: "manual",
  };

  const list = loadReservas();
  list.push(reserva);
  saveReservas(list);
  return { ok: true, reserva };
}

// ─── Create walk-in for a specific mesa ──────────────────────────────────────

export function createWalkInForMesa(
  mesaId: string, personas: number, nombre: string, telefono: string, notas: string,
): { ok: true; reserva: ReservaLocal } | { ok: false; error: string } {
  const hoy = new Date().toISOString().split("T")[0];
  const hora = new Date().toTimeString().slice(0, 5);
  const servicio: ServicioLocal = new Date().getHours() >= 17 ? "cena" : "comida";

  if (ocupadasEn(hoy, hora, servicio, personas).has(mesaId)) {
    return { ok: false, error: "Esta mesa está ocupada o tiene una reserva próxima." };
  }

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
  if (isTableBlockReservation(r)) return { ok: false, error: "Un bloqueo de mesa no se puede sentar." };
  let mesaIds = r.mesaIds;

  if (forceMesaIds && forceMesaIds.length) {
    const validacion = validarMesasLibres(forceMesaIds, r.fecha, r.hora, r.servicio, r.personas, reservaId);
    if (!validacion.ok) return { ok: false, error: validacion.error };
    mesaIds = validacion.mesaIds;
  } else if (!mesaIds.length) {
    const assigned = asignarMesa(r.personas, r.fecha, r.hora, r.servicio, reservaId);
    if (!assigned) return { ok: false, error: "No hay mesas disponibles." };
    mesaIds = assigned;
  } else {
    const validacion = validarMesasLibres(mesaIds, r.fecha, r.hora, r.servicio, r.personas, reservaId);
    if (!validacion.ok) return { ok: false, error: validacion.error };
    mesaIds = validacion.mesaIds;
  }

  list[idx] = { ...r, estado: "sentada", mesaIds, seatedAt: new Date().toISOString() };
  saveReservas(list);
  return { ok: true };
}

// ─── Des-sentar (volver a confirmada sin liberar la reserva) ─────────────────

export function desSentarReserva(
  reservaId: string,
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === reservaId);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };

  const r = list[idx];
  if (r.estado !== "sentada") {
    return { ok: false, error: "Solo una reserva sentada puede volver a confirmada." };
  }

  list[idx] = { ...r, estado: "confirmada", seatedAt: undefined };
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

  const r = list[idx];
  if (isTableBlockReservation(r)) {
    return { ok: false, error: "Un bloqueo de mesa no permite cambiar mesa." };
  }
  if (!canMoveReservation(r.estado)) {
    return { ok: false, error: "Esta reserva ya no permite cambiar de mesa." };
  }
  if (r.mesaIds.length === 0) {
    return { ok: false, error: "Esta reserva todavía no tiene mesa asignada." };
  }

  const ids = uniqueMesaIds(newMesaIds);
  const mesas = loadMesas();

  const hoy = new Date().toISOString().split("T")[0];
  const horaReferencia = isOccupied(r) && r.fecha === hoy
    ? new Date().toTimeString().slice(0, 5)
    : r.hora;

  // allowOcupadas=true: el cambio manual de mesa admite cualquier mesa (override).
  const validacion = validarMesasLibres(ids, r.fecha, horaReferencia, r.servicio, r.personas, r.id, undefined, true);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const seleccionadas = validacion.mesaIds
    .map((id) => mesas.find((m) => m.id === id))
    .filter((m): m is MesaLocal => Boolean(m));

  const capacidad = seleccionadas.reduce((total, mesa) => total + mesa.capacidad, 0);
  if (capacidad < r.personas) {
    return {
      ok: false,
      error: `Las mesas seleccionadas tienen ${capacidad} plazas para ${r.personas} personas.`,
    };
  }

  list[idx] = { ...r, mesaIds: validacion.mesaIds };
  saveReservas(list);
  return { ok: true };
}

// ─── Intercambiar mesas entre dos reservas ────────────────────────────────────

// Solo reservas sin sentar (ni walk-ins, ni bloqueos, ni mesas ya ocupadas).
export function esReservaIntercambiable(r: ReservaLocal): boolean {
  return !isTableBlockReservation(r) &&
    (r.estado === "pendiente" || r.estado === "confirmada" || r.estado === "llegada") &&
    r.mesaIds.length > 0;
}

// Reservas del mismo día y servicio con las que se puede intercambiar la mesa.
export function reservasParaIntercambio(reservaId: string): ReservaLocal[] {
  const list = loadReservas();
  const reserva = list.find((r) => r.id === reservaId);
  if (!reserva || !esReservaIntercambiable(reserva)) return [];
  return list
    .filter((r) =>
      r.id !== reserva.id &&
      r.fecha === reserva.fecha &&
      r.servicio === reserva.servicio &&
      esReservaIntercambiable(r) &&
      !r.mesaIds.some((id) => reserva.mesaIds.includes(id)),
    )
    .sort((a, b) => a.hora.localeCompare(b.hora) || a.nombre.localeCompare(b.nombre));
}

export function intercambiarReservas(
  idA: string, idB: string,
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const ia = list.findIndex((r) => r.id === idA);
  const ib = list.findIndex((r) => r.id === idB);
  if (ia < 0 || ib < 0) return { ok: false, error: "Reserva no encontrada." };
  const a = list[ia];
  const b = list[ib];
  if (!esReservaIntercambiable(a) || !esReservaIntercambiable(b)) {
    return { ok: false, error: "Solo se pueden intercambiar reservas sin sentar (ni walk-ins ni bloqueos)." };
  }
  if (a.mesaIds.some((id) => b.mesaIds.includes(id))) {
    return { ok: false, error: "Las dos reservas comparten mesa." };
  }
  const mesas = loadMesas();
  const capacidadDe = (ids: string[]) => ids
    .map((id) => mesas.find((m) => m.id === id))
    .filter((m): m is MesaLocal => Boolean(m))
    .reduce((total, mesa) => total + mesa.capacidad, 0);
  const capB = capacidadDe(b.mesaIds);
  if (capB < a.personas) {
    return { ok: false, error: `${mesaLabel(b.mesaIds)} tiene ${capB} plazas para las ${a.personas} personas de ${a.nombre}.` };
  }
  const capA = capacidadDe(a.mesaIds);
  if (capA < b.personas) {
    return { ok: false, error: `${mesaLabel(a.mesaIds)} tiene ${capA} plazas para las ${b.personas} personas de ${b.nombre}.` };
  }
  list[ia] = { ...a, mesaIds: b.mesaIds };
  list[ib] = { ...b, mesaIds: a.mesaIds };
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
  const next = { ...list[idx], hora: nuevaHora, ...(nuevaFecha ? { fecha: nuevaFecha } : {}) };
  if (isTableBlockReservation(next)) {
    return { ok: false, error: "Edita el bloqueo desde el plano de mesas." };
  }
  if (next.mesaIds.length) {
    const validacion = validarMesasLibres(
      next.mesaIds,
      next.fecha,
      next.hora,
      next.servicio,
      next.personas,
      id,
    );
    if (!validacion.ok) return { ok: false, error: validacion.error };
    next.mesaIds = validacion.mesaIds;
  }
  list[idx] = next;
  saveReservas(list);
  return { ok: true };
}

// Edita datos básicos de una reserva (personas, hora y/o mesa) sin cambiar su estado.
export function editReserva(
  id: string, cambios: { personas?: number; hora?: string; mesaIds?: string[] },
): { ok: true } | { ok: false; error: string } {
  const list = loadReservas();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "Reserva no encontrada." };
  const limpio: Partial<ReservaLocal> = {};
  if (typeof cambios.personas === "number" && cambios.personas > 0) limpio.personas = cambios.personas;
  if (cambios.hora && cambios.hora.length >= 4) limpio.hora = cambios.hora;
  const nuevasMesas = cambios.mesaIds ? uniqueMesaIds(cambios.mesaIds) : [];
  const mesaCambiada = nuevasMesas.length > 0 &&
    (nuevasMesas.length !== list[idx].mesaIds.length || nuevasMesas.some((m) => !list[idx].mesaIds.includes(m)));
  if (mesaCambiada) limpio.mesaIds = nuevasMesas;
  const next = { ...list[idx], ...limpio };
  if (isTableBlockReservation(next)) {
    return { ok: false, error: "Edita el bloqueo desde el plano de mesas." };
  }
  if (typeof cambios.personas === "number" && cambios.personas > 0) {
    next.duracionMin = duracionReserva(cambios.personas);
  }
  if (next.mesaIds.length) {
    // Cambio manual de mesa → mismo criterio que cambiarMesas: el admin puede
    // elegir cualquier mesa (override), solo se valida el aforo.
    const validacion = validarMesasLibres(
      next.mesaIds,
      next.fecha,
      next.hora,
      next.servicio,
      next.personas,
      id,
      undefined,
      mesaCambiada,
    );
    if (!validacion.ok) return { ok: false, error: validacion.error };
    next.mesaIds = validacion.mesaIds;
    if (mesaCambiada) {
      const mesas = loadMesas();
      const capacidad = next.mesaIds
        .map((mid) => mesas.find((m) => m.id === mid))
        .filter((m): m is MesaLocal => Boolean(m))
        .reduce((total, mesa) => total + mesa.capacidad, 0);
      if (capacidad < next.personas) {
        return {
          ok: false,
          error: `Las mesas seleccionadas tienen ${capacidad} plazas para ${next.personas} personas.`,
        };
      }
    }
  }
  list[idx] = next;
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
  const activas = todas.filter((r) => isActiveReservation(r.estado) && !isTableBlockReservation(r));
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

  const activas = all.filter((r) => isActiveReservation(r.estado) && !isTableBlockReservation(r));
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
