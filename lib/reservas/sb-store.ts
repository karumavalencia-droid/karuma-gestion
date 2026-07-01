// ─── Karuma Reservas — Supabase client helpers ────────────────────────────────
// All reads go directly to Supabase. No localStorage for reservations.

import { getSupabaseClient } from "@/lib/supabase/client";
import { isActiveReservation, isTableBlockReservation, stripTableBlockNotes } from "@/lib/reservas/helpers";
import type { EstadoReserva } from "@/lib/reservas/types";
import {
  MESAS_SEED,
  type ReservaLocal,
  type MesaLocal,
  type MesaConEstado,
  type MesaStatus,
  type ServicioLocal,
  type StatsLocal,
} from "@/lib/reservas/local-store";

// ─── Estado mapping ───────────────────────────────────────────────────────────

function mapEstadoSb(e: EstadoReserva): ReservaLocal["estado"] {
  switch (e) {
    case "Confirmada": return "confirmada";
    case "Sentado":    return "sentada";
    case "Finalizada": return "finished";
    case "Cancelada":  return "cancelada";
    case "NoShow":     return "no-show";
    case "WalkIn":     return "walkin";
    default:           return "confirmada";
  }
}

export function mapEstadoLocalToSb(e: ReservaLocal["estado"]): EstadoReserva {
  switch (e) {
    case "confirmada": return "Confirmada";
    case "pendiente":  return "Confirmada";
    case "sentada":    return "Sentado";
    case "finished":   return "Finalizada";
    case "cancelada":  return "Cancelada";
    case "no-show":    return "NoShow";
    case "walkin":     return "WalkIn";
    default:           return "Confirmada";
  }
}

// ─── Row → ReservaLocal ───────────────────────────────────────────────────────

export function mapSbRow(row: Record<string, unknown>): ReservaLocal {
  const cliente = (row.clientes_reservas ?? {}) as { nombre?: string; telefono?: string; email?: string | null };
  const origen = (row.origen as "online" | "telefono" | "walkin" | "manual") ?? "online";
  const mesaIds = ((row.mesa_ids as number[]) ?? []).map((n: number) => `T${n}`);
  const notas = (row.notas as string) ?? "";
  const isBlock = isTableBlockReservation({ notas });
  return {
    id: row.id as string,
    type: (isBlock ? "table_block" : origen === "walkin" ? "walk_in" : "reservation") as ReservaLocal["type"],
    fecha: row.fecha as string,
    hora: String(row.hora_inicio ?? "").slice(0, 5),
    duracionMin: row.duracion_min as number,
    servicio: row.servicio as ServicioLocal,
    personas: isBlock ? 0 : row.personas as number,
    mesaIds,
    nombre: isBlock ? "Bloqueo mesa" : cliente.nombre ?? "Sin nombre",
    telefono: isBlock ? "" : cliente.telefono ?? "",
    email: cliente.email ?? null,
    notas: isBlock ? stripTableBlockNotes(notas) : notas,
    estado: mapEstadoSb(row.estado as EstadoReserva),
    creadoEn: (row.created_at as string) ?? new Date().toISOString(),
    origen,
    reviewEmailSentAt: (row.review_email_sent_at as string | null) ?? null,
  };
}

// ─── Fetch reservas for a date ────────────────────────────────────────────────

export async function fetchReservasSb(fecha: string): Promise<ReservaLocal[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from("reservas")
    .select("*, clientes_reservas(nombre, telefono, email)")
    .eq("fecha", fecha)
    .order("hora_inicio");

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapSbRow);
}

// ─── Fetch mesas with status for a date+servicio ──────────────────────────────

export async function fetchMesasConEstadoSb(
  fecha: string,
  servicio: string,
): Promise<MesaConEstado[]> {
  const sb = getSupabaseClient();

  // Use Supabase mesas if available, fall back to seed
  let mesas: MesaLocal[] = MESAS_SEED;
  if (sb) {
    const { data: dbMesas } = await sb.from("mesas").select("*").eq("activa", true).order("numero");
    if (dbMesas && dbMesas.length > 0) {
      mesas = (dbMesas as { id: number; numero: number; capacidad: number; zona: string | null }[]).map((m) => ({
        id: `T${m.numero}`,
        numero: m.numero,
        capacidad: m.capacidad,
        zona: m.zona ?? "Interior",
      }));
    }
  }

  if (!sb) {
    return mesas.map((m) => ({ ...m, status: "available" as MesaStatus }));
  }

  const { data } = await sb
    .from("reservas")
    .select("*, clientes_reservas(nombre, telefono, email)")
    .eq("fecha", fecha)
    .eq("servicio", servicio as "comida" | "cena");

  const reservas: ReservaLocal[] = data
    ? (data as Record<string, unknown>[]).map(mapSbRow)
    : [];

  const activeReservas = reservas.filter((r) => isActiveReservation(r.estado));

  return mesas.map((m) => {
    const occ = activeReservas.find(
      (r) => (r.estado === "sentada" || r.estado === "walkin") && r.mesaIds.includes(m.id),
    );
    if (occ) return { ...m, status: "occupied" as MesaStatus, reserva: occ };

    const res = activeReservas.find(
      (r) => (r.estado === "confirmada" || r.estado === "pendiente") && r.mesaIds.includes(m.id),
    );
    if (res) return { ...m, status: "reserved" as MesaStatus, reserva: res };

    return { ...m, status: "available" as MesaStatus };
  });
}

// ─── Dashboard stats from Supabase ───────────────────────────────────────────

export async function fetchStatsSb(fecha: string): Promise<StatsLocal> {
  const sb = getSupabaseClient();
  const empty: StatsLocal = {
    reservasHoy: 0, paxHoy: 0, walkInsHoy: 0, sentadasHoy: 0,
    noShowsHoy: 0, canceladasHoy: 0, mesasOcupadas: 0,
    mesasTotal: MESAS_SEED.length, proximaHora: "—", proximaNombre: "—",
  };

  if (!sb) return empty;

  const { data } = await sb
    .from("reservas")
    .select("*, clientes_reservas(nombre, telefono, email)")
    .eq("fecha", fecha);

  if (!data) return empty;

  const all = (data as Record<string, unknown>[]).map(mapSbRow);
  const ahora = new Date().toTimeString().slice(0, 5);

  const activas = all.filter((r) => isActiveReservation(r.estado) && !isTableBlockReservation(r));
  const sentadas = all.filter((r) => r.estado === "sentada" || r.estado === "walkin");
  const mesasOc = new Set<string>();
  sentadas.forEach((r) => r.mesaIds.forEach((id) => mesasOc.add(id)));

  const proximas = activas
    .filter((r) => r.hora > ahora && (r.estado === "pendiente" || r.estado === "confirmada"))
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const proxima = proximas[0];

  // Get total mesas count
  const { count } = await sb.from("mesas").select("*", { count: "exact", head: true }).eq("activa", true);

  return {
    reservasHoy: activas.length,
    paxHoy: activas.reduce((s, r) => s + r.personas, 0),
    walkInsHoy: all.filter((r) => r.type === "walk_in").length,
    sentadasHoy: sentadas.length,
    noShowsHoy: all.filter((r) => r.estado === "no-show").length,
    canceladasHoy: all.filter((r) => r.estado === "cancelada").length,
    mesasOcupadas: mesasOc.size,
    mesasTotal: count ?? MESAS_SEED.length,
    proximaHora: proxima?.hora ?? "—",
    proximaNombre: proxima?.nombre ?? "—",
  };
}

// ─── Action helper (calls API routes) ────────────────────────────────────────

export async function accionReservaSb(
  action: string,
  id: string,
  extra?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/reservas/actualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, ...extra }),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "Error desconocido" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
