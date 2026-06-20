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

  const { error } = await sb
    .from("reservas")
    .update({ estado: mapLocalToSb(estado) })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true });
}
