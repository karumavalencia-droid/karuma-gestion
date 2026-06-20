import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa } from "@/lib/reservas/disponibilidad";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, telefono, personas, fecha, hora, servicio, notas, origen = "online" } = body;

  if (!nombre || !telefono || !personas || !fecha || !hora || !servicio) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
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
  const mesaIds = asignarMesa(
    mesas as Mesa[],
    (reservasExistentes ?? []) as Reserva[],
    fecha,
    hora,
    duracion,
    personas,
    config,
  );

  if (!mesaIds) {
    return NextResponse.json({ error: "No hay disponibilidad para ese horario" }, { status: 409 });
  }

  // Upsert cliente por teléfono
  const { data: clienteExistente } = await supabase
    .from("clientes_reservas")
    .select("id, visitas")
    .eq("telefono", telefono)
    .maybeSingle();

  let clienteId: string;
  if (clienteExistente) {
    clienteId = clienteExistente.id;
    await supabase
      .from("clientes_reservas")
      .update({ nombre, visitas: clienteExistente.visitas + 1 })
      .eq("id", clienteId);
  } else {
    const { data: nuevoCliente, error } = await supabase
      .from("clientes_reservas")
      .insert({ nombre, telefono, visitas: 1 })
      .select("id")
      .single();
    if (error || !nuevoCliente) {
      return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
    }
    clienteId = nuevoCliente.id;
  }

  const { data: reserva, error: errReserva } = await supabase
    .from("reservas")
    .insert({
      cliente_id: clienteId,
      fecha,
      hora_inicio: hora,
      duracion_min: duracion,
      servicio,
      personas,
      mesa_ids: mesaIds,
      estado: "Confirmada",
      notas: notas ?? null,
      origen,
    })
    .select("id")
    .single();

  if (errReserva || !reserva) {
    return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reservaId: reserva.id, mesaIds });
}
