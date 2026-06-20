// Syncs online Supabase reservations into localStorage so admin operations work uniformly.
// Called from admin dashboard on every reload. Never overwrites existing localStorage entries.

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

/**
 * Fetches reservations from Supabase for the given date and merges them into
 * localStorage. Returns the full merged list for that date.
 * Supabase entries that already exist in localStorage (by id) are skipped.
 */
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
        // Build map of online-sourced entries by id for fast lookup
        const localMap = new Map(local.map((r) => [r.id, r]));
        let changed = false;
        for (const row of data as SbRow[]) {
          const mapped = mapSbRow(row);
          const existing = localMap.get(mapped.id);
          if (!existing) {
            // New entry from Supabase
            localMap.set(mapped.id, mapped);
            changed = true;
          } else if (existing.origen === "online" && existing.estado !== mapped.estado) {
            // Update estado for online entries if changed in Supabase
            localMap.set(mapped.id, { ...existing, estado: mapped.estado });
            changed = true;
          }
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
