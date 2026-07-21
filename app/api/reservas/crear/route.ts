import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asignarMesa, mesasOcupadasEnSlot } from "@/lib/reservas/disponibilidad";
import { sendReservationConfirmationEmail } from "@/lib/reservas/email";
import {
  buildTableBlockNotes,
  isActiveReservation,
  isTableBlockReservation,
  normalizeReservationStatus,
} from "@/lib/reservas/helpers";
import type { Mesa, Reserva, ReservasConfig } from "@/lib/reservas/types";

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
    duracionMin,
    idempotencyKey,
  } = body as {
    nombre: string; telefono: string; email?: string; personas: number;
    fecha: string; hora: string; servicio: string; notas?: string;
    origen?: string; forceMesaIds?: number[]; bloqueo?: boolean; duracionMin?: number; idempotencyKey?: string;
  };
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

  let reusedReserva:
    | { id: string; mesa_ids: number[]; cliente_id: string | null; confirmation_email_sent_at: string | null }
    | null = null;

  if (idempotentReservaId) {
    const { data: reservaExistente } = await supabase
      .from("reservas")
      .select("id, mesa_ids, cliente_id, confirmation_email_sent_at")
      .eq("id", idempotentReservaId)
      .maybeSingle();

    if (reservaExistente) {
      reusedReserva = reservaExistente;
    }
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

  const nombreReserva = typeof nombre === "string" ? nombre.trim() : "";
  const nombreCliente = nombreReserva || (isTableBlock ? "Bloqueo mesa" : isWalkIn ? "Walk-In" : "Sin nombre");

  // Upsert cliente por teléfono (optional for walk-in). Las visitas se suman
  // solo después de insertar la reserva para que los reintentos no dupliquen.
  let clienteId: string | null = null;
  let clienteVisitas = 0;
  if (!isTableBlock && telefonoCliente && !reusedReserva) {
    const { data: clienteExistente } = await supabase
      .from("clientes_reservas")
      .select("id, visitas")
      .eq("telefono", telefonoCliente)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      clienteVisitas = Number(clienteExistente.visitas) || 0;
    } else {
      const { data: nuevoCliente, error } = await supabase
        .from("clientes_reservas")
        .insert({ nombre: nombreCliente, telefono: telefonoCliente, email: emailCliente || null, visitas: 0 })
        .select("id, visitas")
        .single();
      if (error || !nuevoCliente) {
        const { data: clienteCreado } = await supabase
          .from("clientes_reservas")
          .select("id, visitas")
          .eq("telefono", telefonoCliente)
          .maybeSingle();

        if (!clienteCreado) {
          return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
        }
        clienteId = clienteCreado.id;
        clienteVisitas = Number(clienteCreado.visitas) || 0;
      } else {
        clienteId = nuevoCliente.id;
        clienteVisitas = Number(nuevoCliente.visitas) || 0;
      }
    }
  }

  if (!isTableBlock && clienteId && !reusedReserva) {
    const duplicada = ((reservasExistentes ?? []) as Reserva[]).find(
      (r) =>
        r.cliente_id === clienteId &&
        r.fecha === fecha &&
        r.hora_inicio.slice(0, 5) === hora &&
        r.servicio === servicio &&
        r.personas === personasReserva &&
        isActiveReservation(r.estado),
    );

    if (duplicada) {
      return NextResponse.json({
        ok: true,
        reservaId: duplicada.id,
        mesaIds: duplicada.mesa_ids,
        emailSent: false,
        duplicate: true,
      });
    }
  }

  if (reusedReserva?.confirmation_email_sent_at) {
    return NextResponse.json({
      ok: true,
      reservaId: reusedReserva.id,
      mesaIds,
      emailSent: true,
      duplicate: true,
    });
  }

  let reservaId = reusedReserva?.id ?? "";
  if (!reusedReserva) {
    const { data: nuevaReserva, error: errReserva } = await supabase
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
        notas: isTableBlock ? buildTableBlockNotes(notas) : notas ?? null,
        origen: (isTableBlock ? "manual" : origen) as "online" | "telefono" | "walkin" | "manual",
      })
      .select("id")
      .single();

    if (errReserva || !nuevaReserva) {
      return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
    }

    reservaId = nuevaReserva.id;
  }

  if (!isTableBlock && clienteId && !reusedReserva) {
    await supabase
      .from("clientes_reservas")
      .update({
        ...(nombreReserva ? { nombre: nombreReserva } : {}),
        ...(emailCliente ? { email: emailCliente } : {}),
        visitas: clienteVisitas + 1,
        ultima_visita: fecha,
      })
      .eq("id", clienteId);
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

  if (!isTableBlock && !emailResult.sent && emailResult.reason !== "missing_config") {
    console.warn("Reservation confirmation email not sent", {
      reservaId,
      reason: emailResult.reason,
      error: emailResult.error,
    });
  }

  if (!isTableBlock && emailResult.sent) {
    await supabase
      .from("reservas")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", reservaId);
  }

  return NextResponse.json({ ok: true, reservaId, mesaIds, emailSent: emailResult.sent });
}
