// Syncs online Supabase reservations into localStorage so admin operations work uniformly.
// Sync rules:
//   - New entry in Supabase not in localStorage → add it
//   - Existing Supabase-backed entries are refreshed from Supabase so tablet/mobile stay aligned.

import { getSupabaseClient } from "@/lib/supabase/client";
import { isTableBlockReservation, stripTableBlockNotes } from "@/lib/reservas/helpers";
import {
  loadReservas,
  saveReservas,
  type ReservaLocal,
  type EstadoLocal,
  type ServicioLocal,
} from "./local-store";
import type { EstadoReserva } from "./types";

// When staff seats a reservation, the local UI is updated immediately and the
// Supabase status update follows. A realtime/reload can land in the tiny window
// before Supabase exposes the new status and must not turn the table light green
// again. Keep the fresh local occupied state briefly, then trust Supabase again.
const LOCAL_OCCUPIED_SYNC_GRACE_MS = 15_000;

function mapEstadoSb(e: EstadoReserva): EstadoLocal {
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

type SbRow = Record<string, unknown>;

function mapSbRow(r: SbRow): ReservaLocal {
  const cliente = (r.clientes_reservas ?? {}) as { nombre?: string; telefono?: string; email?: string | null };
  const origen = (r.origen as "online" | "telefono" | "walkin" | "manual") ?? "online";
  const notas = (r.notas as string) ?? "";
  const isBlock = isTableBlockReservation({ notas });
  return {
    id: r.id as string,
    type: isBlock ? "table_block" : origen === "walkin" ? "walk_in" : "reservation",
    fecha: r.fecha as string,
    hora: (r.hora_inicio as string).slice(0, 5), // "20:15:00" → "20:15"
    duracionMin: r.duracion_min as number,
    servicio: r.servicio as ServicioLocal,
    personas: isBlock ? 0 : r.personas as number,
    mesaIds: ((r.mesa_ids as number[]) ?? []).map((n) => `T${n}`),
    nombre: isBlock ? "Bloqueo mesa" : cliente.nombre ?? "Online",
    telefono: isBlock ? "" : cliente.telefono ?? "",
    email: cliente.email ?? null,
    notas: isBlock ? stripTableBlockNotes(notas) : notas,
    estado: mapEstadoSb(r.estado as EstadoReserva),
    creadoEn: r.created_at as string,
    origen,
    confirmationEmailSentAt: (r.confirmation_email_sent_at as string | null) ?? null,
    reviewEmailSentAt: (r.review_email_sent_at as string | null) ?? null,
    // La duración en mesa siempre parte del momento real en que se sentó.
    // `created_at` es la creación de la reserva y puede ser horas o días anterior.
    seatedAt: r.estado === "Sentado" || r.estado === "WalkIn"
      ? (r.seated_at as string | undefined)
      : undefined,
  };
}

export async function syncAndLoadReservas(fecha: string): Promise<ReservaLocal[]> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data } = await sb
        .from("reservas")
        .select("*, clientes_reservas(nombre, telefono, email)")
        .eq("fecha", fecha);

      if (data && data.length > 0) {
        const local = loadReservas();
        const localMap = new Map(local.map((r) => [r.id, r]));
        let changed = false;

        for (const row of data as SbRow[]) {
          const mapped = mapSbRow(row);
          const existing = localMap.get(mapped.id);

          if (!existing) {
            // New entry from Supabase — add it
            localMap.set(mapped.id, mapped);
            changed = true;
          } else if (existing.origen || mapped.origen) {
            // Keep Supabase-backed reservations fresh across devices.
            // Right after seating, a reload/realtime event may still read the
            // previous Confirmada status from Supabase. Preserve the fresh local
            // occupied state for a short grace window so the table stays dark
            // green instead of flashing/reverting to Reservada.
            const mappedOccupied = mapped.estado === "sentada" || mapped.estado === "walkin";
            const existingOccupied = existing.estado === "sentada" || existing.estado === "walkin";
            const seatedAtMs = existing.seatedAt ? Date.parse(existing.seatedAt) : Number.NaN;
            const freshLocalSeat =
              existingOccupied &&
              Number.isFinite(seatedAtMs) &&
              Date.now() - seatedAtMs >= 0 &&
              Date.now() - seatedAtMs < LOCAL_OCCUPIED_SYNC_GRACE_MS;
            const keepFreshLocalOccupied = freshLocalSeat && !mappedOccupied && mapped.estado === "confirmada";

            localMap.set(mapped.id, {
              ...existing,
              ...mapped,
              ...(keepFreshLocalOccupied ? { estado: existing.estado } : {}),
              seatedAt: keepFreshLocalOccupied
                ? existing.seatedAt
                : mappedOccupied
                  ? (mapped.seatedAt ?? existing.seatedAt)
                  : undefined,
            });
            changed = true;
          } else if (!existing.personas && mapped.personas) {
            // Migración: si la reserva local no tiene personas pero Supabase sí, actualizar
            localMap.set(mapped.id, { ...existing, personas: mapped.personas });
            changed = true;
          }
          // In all other cases local state wins (non-terminal Supabase never overwrites local)
        }

        if (changed) {
          saveReservas([...localMap.values()]);
        }
      }
    } catch {
      // Network/RLS error — fall back to localStorage only
    }
  }

  return loadReservas().filter((r) => r.fecha === fecha);
}
