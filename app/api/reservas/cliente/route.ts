import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa, calcularSlotsDisponibles, mesasOcupadasEnSlot } from "@/lib/reservas/disponibilidad";
import { horarioEfectivo, reservaDentroDeHorario } from "@/lib/reservas/horario-publico";
import { isValidOnlinePartySize, MAX_ONLINE_PARTY_SIZE } from "@/lib/reservas/config";
import { isActiveReservation, isTableBlockReservation } from "@/lib/reservas/helpers";
import { LIMITE_CAMBIO_CLIENTE_MIN, verificarTokenReservaCliente } from "@/lib/reservas/cliente-token";
import { registrarEvento } from "@/lib/reservas/historial";
import type { HorarioDia, Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

// Gestión de la reserva por el propio cliente (enlace del correo de confirmación).
// GET  ?id&t                         → datos de la reserva
// GET  ?id&t&fecha&servicio&personas → horas libres para cambiarla (sin contar su propia mesa)
// POST {id, t, action: "cancelar"}
// POST {id, t, action: "cambiar", fecha, hora, personas}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_DIAS = 30;

function madridAhora() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return { fecha: s.slice(0, 10), min: Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) };
}
function toMin(h: string) { const [a, b] = h.slice(0, 5).split(":").map(Number); return a * 60 + (b || 0); }
function diasEntre(a: string, b: string) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000); }
// Minutos que faltan hasta la reserva (negativo si ya pasó)
function minutosHasta(fecha: string, hora: string) {
  const now = madridAhora();
  return diasEntre(now.fecha, fecha) * 1440 + toMin(hora) - now.min;
}
function duracionPara(personas: number, c: ReservasConfig) {
  return personas <= 2 ? c.duracion_1_2_min : personas <= 4 ? c.duracion_3_4_min : c.duracion_5_6_min;
}
function err(error: string, status = 400) { return NextResponse.json({ ok: false, error }, { status }); }

async function cargar(req: NextRequest, id: string | null, t: unknown) {
  if (!id || !verificarTokenReservaCliente(id, t)) return { fail: err("Enlace no válido", 404) };
  const sb = getSupabaseAdmin();
  if (!sb) return { fail: err("Servicio no disponible", 503) };
  const { data: r } = await sb.from("reservas").select("*").eq("id", id).maybeSingle();
  if (!r || isTableBlockReservation(r)) return { fail: err("Reserva no encontrada", 404) };
  return { sb, r: r as Reserva & { cliente_id: string | null } };
}

function puedeGestionar(r: Reserva) {
  if (!isActiveReservation(r.estado) || r.estado !== "Confirmada") return { ok: false, motivo: r.estado === "Cancelada" ? "cancelada" : "cerrada" };
  if (minutosHasta(r.fecha, r.hora_inicio) < LIMITE_CAMBIO_CLIENTE_MIN) return { ok: false, motivo: "tarde" };
  return { ok: true, motivo: "" };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const c = await cargar(req, q.get("id"), q.get("t"));
  if (c.fail) return c.fail;
  const { sb, r } = c;

  // Horas libres para cambiar
  const fecha = q.get("fecha");
  if (fecha) {
    const servicio = q.get("servicio") === "cena" ? "cena" : "comida";
    const personas = Number(q.get("personas") ?? r.personas);
    if (!isValidOnlinePartySize(personas)) return err(`Máximo ${MAX_ONLINE_PARTY_SIZE} personas online`);
    const dia = new Date(`${fecha}T12:00:00`).getDay();
    const [{ data: mesas }, { data: reservas }, { data: configData }, { data: cierres }, { data: horario }] = await Promise.all([
      sb.from("mesas").select("*").eq("activa", true),
      sb.from("reservas").select("*").eq("fecha", fecha),
      sb.from("reservas_config").select("*").eq("id", 1).single(),
      sb.from("cierres_servicio").select("servicio").eq("fecha", fecha),
      sb.from("horario_semanal").select("*").eq("dia", dia).maybeSingle(),
    ]);
    const h = horario as HorarioDia | null;
    if (!mesas || !configData) return err("Error al cargar datos", 500);
    if ((h && (!h.activo || (servicio === "comida" ? !h.comida_activa : !h.cena_activa)))
      || (cierres ?? []).some((x) => x.servicio === servicio || x.servicio === "todo")) {
      return NextResponse.json({ ok: true, slots: [], cerrado: true });
    }
    const config = horarioEfectivo(configData as ReservasConfig, h);
    const otras = ((reservas ?? []) as Reserva[]).filter((x) => x.id !== r.id);
    const slots = calcularSlotsDisponibles(mesas as Mesa[], otras, config, fecha, servicio, personas)
      .map((s) => ({ ...s, disponible: s.disponible && minutosHasta(fecha, s.hora) >= LIMITE_CAMBIO_CLIENTE_MIN }));
    return NextResponse.json({ ok: true, slots });
  }

  const g = puedeGestionar(r);
  const { data: cfg } = await sb.from("reservas_config").select("telefono").eq("id", 1).maybeSingle();
  let nombre = "";
  if (r.cliente_id) {
    const { data: cli } = await sb.from("clientes_reservas").select("nombre").eq("id", r.cliente_id).maybeSingle();
    nombre = String(cli?.nombre ?? "").split(" ")[0];
  }
  return NextResponse.json({
    ok: true,
    reserva: { fecha: r.fecha, hora: r.hora_inicio.slice(0, 5), personas: r.personas, servicio: r.servicio, estado: r.estado, nombre },
    puedeGestionar: g.ok,
    motivo: g.motivo,
    limiteMin: LIMITE_CAMBIO_CLIENTE_MIN,
    maxPersonas: MAX_ONLINE_PARTY_SIZE,
    maxDias: MAX_DIAS,
    telefono: (cfg as { telefono?: string | null } | null)?.telefono ?? null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { id?: string; t?: string; action?: string; fecha?: string; hora?: string; personas?: number };
  const c = await cargar(req, body.id ?? null, body.t);
  if (c.fail) return c.fail;
  const { sb, r } = c;
  const g = puedeGestionar(r);
  if (!g.ok) {
    return err(g.motivo === "tarde"
      ? `Faltan menos de ${LIMITE_CAMBIO_CLIENTE_MIN / 60} horas: llámanos para cambiarla o cancelarla.`
      : "Esta reserva ya no se puede modificar.", 409);
  }

  if (body.action === "cancelar") {
    const { error } = await sb.from("reservas").update({ estado: "Cancelada" }).eq("id", r.id).eq("estado", "Confirmada");
    if (error) return err("No se pudo cancelar", 500);
    await registrarEvento(sb, { reservaId: r.id, accion: "cancelada", detalle: `${r.fecha} ${r.hora_inicio.slice(0, 5)} · ${r.personas} pers.`, actor: "cliente" });
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "cambiar") return err("Acción desconocida");
  const fecha = String(body.fecha ?? "");
  const hora = String(body.hora ?? "").slice(0, 5);
  const personas = Number(body.personas ?? r.personas);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return err("Fecha u hora no válida");
  if (!isValidOnlinePartySize(personas)) return err(`Para más de ${MAX_ONLINE_PARTY_SIZE} personas, llámanos.`);
  const hoy = madridAhora().fecha;
  if (diasEntre(hoy, fecha) < 0 || diasEntre(hoy, fecha) > MAX_DIAS) return err(`Puedes reservar hasta ${MAX_DIAS} días de antelación.`);
  if (minutosHasta(fecha, hora) < LIMITE_CAMBIO_CLIENTE_MIN) return err("Elige una hora con al menos 2 horas de antelación.");
  if (fecha === r.fecha && hora === r.hora_inicio.slice(0, 5) && personas === r.personas) return err("No has cambiado nada.");

  const servicio: "comida" | "cena" = toMin(hora) >= 18 * 60 ? "cena" : "comida";
  const dia = new Date(`${fecha}T12:00:00`).getDay();
  const [{ data: mesas }, { data: reservas }, { data: configData }, { data: cierres }, { data: horario }] = await Promise.all([
    sb.from("mesas").select("*").eq("activa", true),
    sb.from("reservas").select("*").eq("fecha", fecha),
    sb.from("reservas_config").select("*").eq("id", 1).single(),
    sb.from("cierres_servicio").select("servicio").eq("fecha", fecha),
    sb.from("horario_semanal").select("*").eq("dia", dia).maybeSingle(),
  ]);
  if (!mesas || !configData) return err("Error al cargar datos", 500);
  const h = horario as HorarioDia | null;
  const config = horarioEfectivo(configData as ReservasConfig, h);
  const duracion = duracionPara(personas, config);
  if ((h && (!h.activo || (servicio === "comida" ? !h.comida_activa : !h.cena_activa)))
    || (cierres ?? []).some((x) => x.servicio === servicio || x.servicio === "todo")
    || !reservaDentroDeHorario(hora, servicio, duracion, config)) {
    return err("Ese horario no está disponible.", 409);
  }
  const otras = ((reservas ?? []) as Reserva[]).filter((x) => x.id !== r.id);

  // Si la misma mesa sigue libre en el nuevo horario y cabe, se conserva.
  const capacidadActual = (mesas as Mesa[]).filter((m) => r.mesa_ids.includes(m.id)).reduce((a, m) => a + m.capacidad, 0);
  const ocupadas = mesasOcupadasEnSlot(otras, fecha, hora, duracion, config.turno_gap_min ?? 30);
  const libreConMisMesas = r.mesa_ids.every((id) => !ocupadas.has(id));
  let mesaIds: number[] | null = r.mesa_ids.length && capacidadActual >= personas && libreConMisMesas ? r.mesa_ids : null;
  if (!mesaIds) mesaIds = asignarMesa(mesas as Mesa[], otras, fecha, hora, duracion, personas, config);
  if (!mesaIds) return err("No queda mesa libre a esa hora. Prueba otra.", 409);

  const { error } = await sb.from("reservas").update({
    fecha, hora_inicio: hora, servicio, personas, duracion_min: duracion, mesa_ids: mesaIds,
  }).eq("id", r.id).eq("estado", "Confirmada");
  if (error) return err("No se pudo cambiar la reserva", 500);

  const cambios: string[] = [];
  if (fecha !== r.fecha) cambios.push(`${r.fecha} → ${fecha}`);
  if (hora !== r.hora_inicio.slice(0, 5)) cambios.push(`${r.hora_inicio.slice(0, 5)} → ${hora}`);
  if (personas !== r.personas) cambios.push(`${r.personas} → ${personas} pers.`);
  if (mesaIds.join(",") !== r.mesa_ids.join(",")) cambios.push(`mesa ${r.mesa_ids.join("+") || "—"} → ${mesaIds.join("+")}`);
  await registrarEvento(sb, { reservaId: r.id, accion: "cambiada", detalle: cambios.join(" · "), actor: "cliente" });
  return NextResponse.json({ ok: true, reserva: { fecha, hora, personas, servicio } });
}
