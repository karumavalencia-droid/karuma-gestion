import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa, mesasOcupadasEnSlot } from "@/lib/reservas/disponibilidad";
import { sendReservationConfirmationEmail } from "@/lib/reservas/email";
import { buildTableBlockNotes } from "@/lib/reservas/helpers";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nombre, telefono, email, personas, fecha, hora, servicio, notas,
    origen = "online",
    forceMesaIds,  // number[] | undefined — skip auto-assign if provided
    bloqueo = false,
    duracionMin,
  } = body as {
    nombre: string; telefono: string; email?: string; personas: number;
    fecha: string; hora: string; servicio: string; notas?: string;
    origen?: string; forceMesaIds?: number[]; bloqueo?: boolean; duracionMin?: number;
  };
  const emailCliente = typeof email === "string" ? email.trim().toLowerCase() : "";
  const isTableBlock = bloqueo === true;
  const personasReserva = Number(personas);

  if (!fecha || !hora || !servicio || (!isTableBlock && (!personasReserva || personasReserva < 1))) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (isTableBlock && (!forceMesaIds || forceMesaIds.length === 0)) {
    return NextResponse.json({ error: "Selecciona al menos una mesa para bloquear" }, { status: 400 });
  }
  if (!isTableBlock && (origen === "online" || origen === "telefono" || origen === "manual")) {
    if (!telefono) {
      return NextResponse.json({ error: "El teléfono es obligatorio" }, { status: 400 });
    }
  }
  if (!isTableBlock && origen === "online" && !emailCliente) {
    return NextResponse.json({ error: "El email es obligatorio para enviar la confirmación" }, { status: 400 });
  }
  if (emailCliente && !isValidEmail(emailCliente)) {
    return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
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

  if (!isTableBlock && origen === "online") {
    if (!config.reservas_online_activas) {
      return NextResponse.json({ error: "Las reservas online están desactivadas" }, { status: 403 });
    }
    if (personasReserva > config.max_personas_online) {
      return NextResponse.json({ error: "Máximo de personas por reserva online superado" }, { status: 400 });
    }
  }

  const duracion = isTableBlock
    ? Math.max(15, Math.min(480, Number(duracionMin) || config.duracion_1_2_min))
    : personasReserva <= 2 ? config.duracion_1_2_min : config.duracion_3_4_min;

  // Use forceMesaIds if provided (admin/walkin), otherwise auto-assign
  let mesaIds: number[];
  if (forceMesaIds && forceMesaIds.length > 0) {
    const ocupadas = mesasOcupadasEnSlot(
      (reservasExistentes ?? []) as Reserva[],
      fecha,
      hora,
      duracion,
      config.turno_gap_min ?? 30,
    );
    if (forceMesaIds.some((id) => ocupadas.has(id))) {
      return NextResponse.json(
        { error: `Esta mesa necesita al menos ${config.turno_gap_min ?? 30} min entre dos turnos.` },
        { status: 409 },
      );
    }
    mesaIds = forceMesaIds;
  } else {
    const assigned = asignarMesa(
      mesas as Mesa[],
      (reservasExistentes ?? []) as Reserva[],
      fecha,
      hora,
      duracion,
      personasReserva,
      config,
    );
    if (!assigned) {
      return NextResponse.json({ error: "No hay disponibilidad para ese horario" }, { status: 409 });
    }
    mesaIds = assigned;
  }

  const isWalkIn = origen === "walkin";
  const nombreReserva = typeof nombre === "string" ? nombre.trim() : "";
  const nombreCliente = nombreReserva || (isTableBlock ? "Bloqueo mesa" : isWalkIn ? "Walk-In" : "Sin nombre");

  // Upsert cliente por teléfono (optional for walk-in)
  let clienteId: string | null = null;
  if (!isTableBlock && telefono) {
    const { data: clienteExistente } = await supabase
      .from("clientes_reservas")
      .select("id, visitas")
      .eq("telefono", telefono)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      await supabase
        .from("clientes_reservas")
        .update({
          ...(nombreReserva ? { nombre: nombreReserva } : {}),
          ...(emailCliente ? { email: emailCliente } : {}),
          visitas: clienteExistente.visitas + 1,
          ultima_visita: fecha,
        })
        .eq("id", clienteId);
    } else {
      const { data: nuevoCliente, error } = await supabase
        .from("clientes_reservas")
        .insert({ nombre: nombreCliente, telefono, email: emailCliente || null, visitas: 1 })
        .select("id")
        .single();
      if (error || !nuevoCliente) {
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }
      clienteId = nuevoCliente.id;
    }
  }

  const { data: reserva, error: errReserva } = await supabase
    .from("reservas")
    .insert({
      cliente_id: clienteId,
      fecha,
      hora_inicio: hora,
      duracion_min: duracion,
      servicio: servicio as "comida" | "cena",
      personas: isTableBlock ? 0 : personasReserva,
      mesa_ids: mesaIds,
      estado: (isWalkIn ? "WalkIn" : "Confirmada") as "WalkIn" | "Confirmada",
      notas: isTableBlock ? buildTableBlockNotes(notas) : notas ?? null,
      origen: (isTableBlock ? "manual" : origen) as "online" | "telefono" | "walkin" | "manual",
    })
    .select("id")
    .single();

  if (errReserva || !reserva) {
    return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
  }

  const emailResult = !isTableBlock && emailCliente
    ? await sendReservationConfirmationEmail({
        to: emailCliente,
        nombre: nombreCliente,
        fecha,
        hora,
        servicio,
        personas: personasReserva,
        reservaId: reserva.id,
        mesaIds,
        telefonoRestaurante: config.telefono,
      }).catch((error: unknown) => ({
        sent: false as const,
        reason: "request_failed" as const,
        error: error instanceof Error ? error.message : String(error),
      }))
    : { sent: false as const, reason: "invalid_recipient" as const };

  if (!isTableBlock && !emailResult.sent && emailResult.reason !== "missing_config") {
    console.warn("Reservation confirmation email not sent", {
      reservaId: reserva.id,
      reason: emailResult.reason,
      error: emailResult.error,
    });
  }

  return NextResponse.json({ ok: true, reservaId: reserva.id, mesaIds, emailSent: emailResult.sent });
}
