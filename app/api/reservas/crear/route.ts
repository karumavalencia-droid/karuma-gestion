import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa } from "@/lib/reservas/disponibilidad";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nombre, telefono, personas, fecha, hora, servicio, notas,
    origen = "online",
    forceMesaIds,  // number[] | undefined — skip auto-assign if provided
  } = body as {
    nombre: string; telefono: string; personas: number;
    fecha: string; hora: string; servicio: string; notas?: string;
    origen?: string; forceMesaIds?: number[];
  };

  // For walk-in/manual, nombre and telefono are optional
  if (!personas || !fecha || !hora || !servicio) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (origen === "online" || origen === "telefono" || origen === "manual") {
    if (!telefono) {
      return NextResponse.json({ error: "El teléfono es obligatorio" }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const [{ data: mesas }, { data: reservasExistentes }, { data: configData }] = await Promise.all([
    supabase.from("mesas").select("*").eq("activa", true),
    supabase.from("reservas").select("*").eq("fecha", fecha),
    supabase.from("reservas_config").select("*").eq("id", 1).single(),
  ]);

  if (!mesas || !configData) {
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 });
  }

  const config = configData as ReservasConfig;

  if (origen === "online") {
    if (!config.reservas_online_activas) {
      return NextResponse.json({ error: "Las reservas online están desactivadas" }, { status: 403 });
    }
    if (personas > config.max_personas_online) {
      return NextResponse.json({ error: "Máximo de personas por reserva online superado" }, { status: 400 });
    }
  }

  const duracion = personas <= 2 ? config.duracion_1_2_min : config.duracion_3_4_min;

  // Use forceMesaIds if provided (admin/walkin), otherwise auto-assign
  let mesaIds: number[];
  if (forceMesaIds && forceMesaIds.length > 0) {
    mesaIds = forceMesaIds;
  } else {
    const assigned = asignarMesa(
      mesas as Mesa[],
      (reservasExistentes ?? []) as Reserva[],
      fecha,
      hora,
      duracion,
      personas,
      config,
    );
    if (!assigned) {
      return NextResponse.json({ error: "No hay disponibilidad para ese horario" }, { status: 409 });
    }
    mesaIds = assigned;
  }

  // Upsert cliente por teléfono (optional for walk-in)
  let clienteId: string | null = null;
  if (telefono) {
    const { data: clienteExistente } = await supabase
      .from("clientes_reservas")
      .select("id, visitas")
      .eq("telefono", telefono)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      await supabase
        .from("clientes_reservas")
        .update({ nombre: nombre ?? clienteExistente, visitas: clienteExistente.visitas + 1, ultima_visita: fecha })
        .eq("id", clienteId);
    } else {
      const { data: nuevoCliente, error } = await supabase
        .from("clientes_reservas")
        .insert({ nombre: nombre ?? "Walk-In", telefono, visitas: 1 })
        .select("id")
        .single();
      if (error || !nuevoCliente) {
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }
      clienteId = nuevoCliente.id;
    }
  }

  const isWalkIn = origen === "walkin";
  const { data: reserva, error: errReserva } = await supabase
    .from("reservas")
    .insert({
      cliente_id: clienteId,
      fecha,
      hora_inicio: hora,
      duracion_min: duracion,
      servicio: servicio as "comida" | "cena",
      personas,
      mesa_ids: mesaIds,
      estado: (isWalkIn ? "WalkIn" : "Confirmada") as "WalkIn" | "Confirmada",
      notas: notas ?? null,
      origen: origen as "online" | "telefono" | "walkin" | "manual",
    })
    .select("id")
    .single();

  if (errReserva || !reserva) {
    return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reservaId: reserva.id, mesaIds });
}
