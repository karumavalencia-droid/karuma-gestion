import { getSupabaseClient } from "@/lib/supabase/client";

export interface ReservasDashboardStats {
  reservasHoy: number;
  clientesReservados: number;
  walkIns: number;
  noShows: number;
  mesasOcupadas: number;
  mesasTotal: number;
  proximaHora: string;
  proximaNombre: string;
}

export async function getReservasDashboardStats(): Promise<ReservasDashboardStats | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const hoy = new Date().toISOString().split("T")[0];

  type ReservaRow = {
    estado: string;
    personas: number;
    hora_inicio: string;
    mesa_ids: number[];
    clientes_reservas: { nombre: string } | null;
  };

  const [{ data: rawReservas }, { data: mesas }] = await Promise.all([
    sb
      .from("reservas")
      .select("estado, personas, hora_inicio, mesa_ids, clientes_reservas(nombre)")
      .eq("fecha", hoy),
    sb.from("mesas").select("id").eq("activa", true),
  ]);
  const reservas = (rawReservas ?? []) as unknown as ReservaRow[];

  if (!rawReservas) return null;

  const ahora = new Date().toTimeString().slice(0, 5);

  const activas = reservas.filter(
    (r) => r.estado !== "Cancelada" && r.estado !== "NoShow" && r.estado !== "Finalizada",
  );

  const walkIns = reservas.filter((r) => r.estado === "WalkIn").length;
  const noShows = reservas.filter((r) => r.estado === "NoShow").length;
  const clientesReservados = activas.reduce((s, r) => s + (r.personas ?? 0), 0);

  const mesasOcupadasIds = new Set<number>();
  activas
    .filter((r) => r.estado === "Sentado" || r.estado === "WalkIn")
    .forEach((r) => (r.mesa_ids as number[]).forEach((id) => mesasOcupadasIds.add(id)));

  const proximas = activas
    .filter((r) => r.hora_inicio > ahora && r.estado === "Confirmada")
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const proxima = proximas[0];
  const proximaHora = proxima ? proxima.hora_inicio.slice(0, 5) : "—";
  const proximaNombre =
    proxima && proxima.clientes_reservas
      ? (proxima.clientes_reservas as { nombre?: string } | null)?.nombre ?? "—"
      : "—";

  return {
    reservasHoy: activas.length,
    clientesReservados,
    walkIns,
    noShows,
    mesasOcupadas: mesasOcupadasIds.size,
    mesasTotal: (mesas ?? []).length || 21,
    proximaHora,
    proximaNombre,
  };
}
