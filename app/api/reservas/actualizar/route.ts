import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { EstadoReserva } from "@/lib/reservas/types";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action: "seat" | "liberar" | "estado" | "cambiar-mesa" | "editar";
    id: string;
    estado?: EstadoReserva;
    mesaIds?: number[];
    personas?: number;
    hora?: string;
  };

  const { action, id, estado, mesaIds } = body;

  if (!action || !id) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let update: any;

  switch (action) {
    case "seat":
      update = { estado: "Sentado" as EstadoReserva };
      break;
    case "liberar":
      update = { estado: "Finalizada" as EstadoReserva };
      break;
    case "estado":
      if (!estado) return NextResponse.json({ error: "Falta estado" }, { status: 400 });
      update = { estado };
      break;
    case "cambiar-mesa":
      if (!mesaIds) return NextResponse.json({ error: "Falta mesaIds" }, { status: 400 });
      update = { mesa_ids: mesaIds };
      break;
    case "editar":
      update = {};
      if (typeof body.personas === "number" && body.personas > 0) update.personas = body.personas;
      if (body.hora && body.hora.length >= 4) update.hora_inicio = body.hora;
      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
      }
      break;
    default:
      return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  }

  const { error } = await supabase.from("reservas").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
