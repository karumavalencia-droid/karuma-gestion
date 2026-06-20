// Syncs online Supabase reservations into localStorage so admin operations work uniformly.
// Sync rules:
//   - New entry in Supabase not in localStorage → add it
//   - Existing entry: terminal states (cancelada/finished/no-show) from Supabase always win
//     because they can only be set by an admin action that also updates both sides.
//     Non-terminal Supabase state (confirmada/sentada) never overwrites local changes.

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadReservas,
  saveReservas,
  type ReservaLocal,
  type EstadoLocal,
  type ServicioLocal,
} from "./local-store";
import type { EstadoReserva } from "./types";

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

// Terminal states can only be set by an explicit admin action — always trust Supabase for these
function isTerminal(e: EstadoLocal): boolean {
  return e === "cancelada" || e === "finished" || e === "no-show";
}

type SbRow = Record<string, unknown>;

function mapSbRow(r: SbRow): ReservaLocal {
  const cliente = (r.clientes_reservas ?? {}) as { nombre?: string; telefono?: string };
  const origen = (r.origen as "online" | "telefono" | "walkin" | "manual") ?? "online";
  return {
    id: r.id as string,
    type: origen === "walkin" ? "walk_in" : "reservation",
    fecha: r.fecha as string,
    hora: (r.hora_inicio as string).slice(0, 5), // "20:15:00" → "20:15"
    servicio: r.servicio as ServicioLocal,
    personas: r.personas as number,
    mesaIds: ((r.mesa_ids as number[]) ?? []).map((n) => `T${n}`),
    nombre: cliente.nombre ?? "Online",
    telefono: cliente.telefono ?? "",
    notas: (r.notas as string) ?? "",
    estado: mapEstadoSb(r.estado as EstadoReserva),
    creadoEn: r.created_at as string,
    origen,
    seatedAt: r.estado === "Sentado" ? (r.created_at as string) : undefined,
  };
}

export async function syncAndLoadReservas(fecha: string): Promise<ReservaLocal[]> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data } = await sb
        .from("reservas")
        .select("*, clientes_reservas(nombre, telefono)")
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
          } else if (existing.origen === "online" && isTerminal(mapped.estado) && !isTerminal(existing.estado)) {
            // Supabase has a terminal state but local is still active:
            // another device/session cancelled/finished this reservation — sync it
            localMap.set(mapped.id, { ...existing, estado: mapped.estado });
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
