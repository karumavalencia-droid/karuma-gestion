import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa, mesasOcupadasEnSlot } from "@/lib/reservas/disponibilidad";
import { sendReservationConfirmationEmail } from "@/lib/reservas/email";
import { buildTableBlockNotes, isTableBlockReservation, normalizeReservationStatus } from "@/lib/reservas/helpers";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";
import { isValidOnlinePartySize } from "@/lib/reservas/config";
import {
  isReservationOrigin,
  isReservationStaffRequest,
  reservationCreationNeedsStaff,
} from "@/lib/reservas/security";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function reservationIdFromIdempotencyKey(key: unknown): string | null {
  if (typeof key !== "string") return null;
  const cleanKey = key.trim();
  if (!cleanKey) return null;
  const bytes = Buffer.from(createHash("sha256").update(`karuma-reserva:${cleanKey}`).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nombre, telefono, email, personas, fecha, hora, servicio, notas,
    origen = "online",
    forceMesaIds,  // number[] | undefined — skip auto-assign if provided
    bloqueo = false,
    duracionMin, idempotencyKey,
  } = body as {
    nombre: string; telefono: string; email?: string; personas: number;
    fecha: string; hora: string; servicio: string; notas?: string;
    origen?: string; forceMesaIds?: number[]; bloqueo?: boolean; duracionMin?: number; idempotencyKey?: string;
  };
  if (!isReservationOrigin(origen)) {
    return NextResponse.json({ error: "Origen de reserva no válido" }, { status: 400 });
  }
  if (reservationCreationNeedsStaff(body) && !(await isReservationStaffRequest(req))) {
    return NextResponse.json({ error: "Inicia sesión para gestionar reservas" }, { status: 401 });
  }
  if (
    origen === "online" &&
    (bloqueo === true || typeof forceMesaIds !== "undefined" || typeof duracionMin !== "undefined")
  ) {
    return NextResponse.json({ error: "Una reserva online no permite asignación manual" }, { status: 400 });
  }
  const telefonoCliente = typeof telefono === "string" ? telefono.trim() : "";
  const emailCliente = typeof email === "string" ? email.trim().toLowerCase() : "";
  const idempotentReservaId = reservationIdFromIdempotencyKey(idempotencyKey);
  const isTableBlock = bloqueo === true;
  const isWalkIn = origen === "walkin";
  const personasReserva = Number(personas);

  if (!fecha || !hora || !servicio || (!isTableBlock && (!personasReserva || personasReserva < 1))) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (isTableBlock && (!forceMesaIds || forceMesaIds.length === 0)) {
    return NextResponse.json({ error: "Selecciona al menos una mesa para bloquear" }, { status: 400 });
  }
  if (!isTableBlock && (origen === "online" || origen === "telefono" || origen === "manual")) {
    if (!telefonoCliente) {
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

  let reusedReserva: { id: string; mesa_ids: number[]; confirmation_email_sent_at: string | null } | null = null;
  if (idempotentReservaId) {
    const { data } = await supabase.from("reservas").select("id, mesa_ids, confirmation_email_sent_at").eq("id", idempotentReservaId).maybeSingle();
    if (data) reusedReserva = data;
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
    if (!isValidOnlinePartySize(personasReserva)) {
      return NextResponse.json({ error: "Máximo de personas por reserva online superado" }, { status: 400 });
    }
  }

  const duracion = isTableBlock
    ? Math.max(15, Math.min(480, Number(duracionMin) || config.duracion_1_2_min))
    : personasReserva <= 2 ? config.duracion_1_2_min : (personasReserva <= 4 ? config.duracion_3_4_min : config.duracion_5_6_min);

  // Online allocation happens atomically in the database after the customer
  // upsert. Staff flows keep their existing manual/automatic assignment.
  let mesaIds: number[] = reusedReserva?.mesa_ids ?? [];
  if (reusedReserva) {
    mesaIds = reusedReserva.mesa_ids ?? [];
  } else if (forceMesaIds && forceMesaIds.length > 0) {
    const existentes = (reservasExistentes ?? []) as Reserva[];
    let ocupadas: Set<number>;
    if (isWalkIn) {
      // Walk-in sentado por el personal: una reserva pendiente (Confirmada) no
      // bloquea la mesa; solo las físicamente ocupadas ahora y los bloqueos.
      ocupadas = mesasOcupadasEnSlot(existentes.filter(isTableBlockReservation), fecha, hora, duracion, 0);
      for (const r of existentes) {
        const st = normalizeReservationStatus(r.estado);
        if (st === "sentado" || st === "walkin") r.mesa_ids.forEach((id) => ocupadas.add(id));
      }
    } else {
      ocupadas = mesasOcupadasEnSlot(existentes, fecha, hora, duracion, config.turno_gap_min ?? 30);
    }
    if (forceMesaIds.some((id) => ocupadas.has(id))) {
      return NextResponse.json(
        {
          error: isWalkIn
            ? "Esta mesa está ocupada o bloqueada ahora mismo."
            : `Esta mesa necesita al menos ${config.turno_gap_min ?? 30} min entre dos turnos.`,
        },
        { status: 409 },
      );
    }
    mesaIds = forceMesaIds;
  } else if (origen !== "online") {
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

  const nombreReserva = typeof nombre === "string" ? nombre.trim() : "";
  const nombreCliente = nombreReserva || (isTableBlock ? "Bloqueo mesa" : isWalkIn ? "Walk-In" : "Sin nombre");

  // Upsert cliente por teléfono (optional for walk-in)
  let clienteId: string | null = null;
  if (!isTableBlock && telefonoCliente && !reusedReserva) {
    const { data: clienteExistente } = await supabase
      .from("clientes_reservas")
      .select("id, visitas")
      .eq("telefono", telefonoCliente)
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
        .insert({ nombre: nombreCliente, telefono: telefonoCliente, email: emailCliente || null, visitas: 0 })
        .select("id")
        .single();
      if (error || !nuevoCliente) {
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }
      clienteId = nuevoCliente.id;
    }
  }

  let reservaId = reusedReserva?.id ?? "";
  if (!reusedReserva && origen === "online" && !isTableBlock) {
    const { data, error } = await supabase.rpc("create_online_reservation_atomic", {
      p_cliente_id: clienteId,
      p_fecha: fecha,
      p_hora_inicio: hora,
      p_servicio: servicio,
      p_personas: personasReserva,
      p_duracion_min: duracion,
      p_notas: notas ?? null,
    });
    const result = data as { reservation_id?: string; mesa_ids?: number[] } | null;
    if (error || !result?.reservation_id || !result.mesa_ids) {
      const noAvailability = error?.message?.includes("NO_TABLE_AVAILABILITY");
      return NextResponse.json(
        { error: noAvailability ? "No hay disponibilidad para ese horario" : "Error al crear reserva" },
        { status: noAvailability ? 409 : 500 },
      );
    }
    reservaId = result.reservation_id;
    mesaIds = result.mesa_ids;
  } else if (!reusedReserva) {
    const { data: reserva, error: errReserva } = await supabase
      .from("reservas")
      .insert({
        ...(idempotentReservaId ? { id: idempotentReservaId } : {}),
        cliente_id: clienteId,
        fecha,
        hora_inicio: hora,
        duracion_min: duracion,
        servicio: servicio as "comida" | "cena",
        personas: isTableBlock ? 0 : personasReserva,
        mesa_ids: mesaIds,
        estado: (isWalkIn ? "WalkIn" : "Confirmada") as "WalkIn" | "Confirmada",
        seated_at: isWalkIn ? new Date().toISOString() : null,
        notas: isTableBlock ? buildTableBlockNotes(notas) : notas ?? null,
        origen: (isTableBlock ? "manual" : origen) as "online" | "telefono" | "walkin" | "manual",
      })
      .select("id")
      .single();

    if (errReserva || !reserva) {
      return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
    }
    reservaId = reserva.id;
  }

  if (!isTableBlock && clienteId && !reusedReserva) {
    await supabase.from("clientes_reservas").update({ ...(nombreReserva ? { nombre: nombreReserva } : {}), ...(emailCliente ? { email: emailCliente } : {}), visitas: 1, ultima_visita: fecha }).eq("id", clienteId);
  }

  if (reusedReserva?.confirmation_email_sent_at) {
    return NextResponse.json({
      ok: true,
      reservaId,
      mesaIds,
      emailSent: true,
      confirmationEmailSentAt: reusedReserva.confirmation_email_sent_at,
      duplicate: true,
    });
  }

  const emailResult = !isTableBlock && emailCliente
    ? await sendReservationConfirmationEmail({
        to: emailCliente,
        nombre: nombreCliente,
        fecha,
        hora,
        servicio,
        personas: personasReserva,
        reservaId,
        mesaIds,
        telefonoRestaurante: config.telefono,
      }).catch((error: unknown) => ({
        sent: false as const,
        reason: "request_failed" as const,
        error: error instanceof Error ? error.message : String(error),
      }))
    : { sent: false as const, reason: "invalid_recipient" as const };

  if (!isTableBlock && !emailResult.sent) {
    console.warn("Reservation confirmation email not sent", {
      reservaId,
      reason: emailResult.reason,
      error: emailResult.error,
    });
  }

  const confirmationEmailSentAt = !isTableBlock && emailResult.sent
    ? new Date().toISOString()
    : null;

  if (confirmationEmailSentAt) {
    await supabase.from("reservas").update({ confirmation_email_sent_at: confirmationEmailSentAt }).eq("id", reservaId);
  }

  return NextResponse.json({
    ok: true,
    reservaId,
    mesaIds,
    emailSent: emailResult.sent,
    confirmationEmailSentAt,
    emailError: emailResult.sent ? null : emailResult.reason,
  });
}
