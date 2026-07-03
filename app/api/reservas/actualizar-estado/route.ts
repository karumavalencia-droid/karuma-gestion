import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { EstadoReserva } from "@/lib/reservas/types";

function mapLocalToSb(estado: string): EstadoReserva {
  switch (estado) {
    case "confirmada":  return "Confirmada";
    case "sentada":     return "Sentado";
    case "finished":    return "Finalizada";
    case "cancelada":   return "Cancelada";
    case "no-show":     return "NoShow";
    case "walkin":      return "WalkIn";
    default:            return "Confirmada";
  }
}

export async function POST(req: NextRequest) {
  const { id, estado } = await req.json() as { id: string; estado: string };
  if (!id || !estado) return NextResponse.json({ error: "id y estado requeridos" }, { status: 400 });

  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: "no admin" });

  const nuevoEstado = mapLocalToSb(estado);

  const { data: actual } = await sb
    .from("reservas")
    .select("estado, cliente_id")
    .eq("id", id)
    .single();

  const { error } = await sb
    .from("reservas")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message });

  // Mantener el contador de no-shows del cliente al entrar o salir del estado NoShow.
  const clienteId = actual?.cliente_id;
  const antes = actual?.estado;
  if (clienteId && antes !== nuevoEstado && (antes === "NoShow" || nuevoEstado === "NoShow")) {
    const delta = nuevoEstado === "NoShow" ? 1 : -1;
    const { data: cliente } = await sb
      .from("clientes_reservas")
      .select("no_shows")
      .eq("id", clienteId)
      .single();
    if (cliente) {
      await sb
        .from("clientes_reservas")
        .update({ no_shows: Math.max(0, (cliente.no_shows ?? 0) + delta) })
        .eq("id", clienteId);
    }
  }

  return NextResponse.json({ ok: true });
}
