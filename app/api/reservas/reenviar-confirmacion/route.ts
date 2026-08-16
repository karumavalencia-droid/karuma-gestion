import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  reservationConfirmationResendKey,
  sendReservationConfirmationEmail,
} from "@/lib/reservas/email";
import { isTableBlockReservation } from "@/lib/reservas/helpers";
import { isReservationStaffRequest } from "@/lib/reservas/security";

type ClienteReservaLite = {
  nombre?: string | null;
  email?: string | null;
};

type ReservaConfirmationRow = {
  id: string;
  fecha: string;
  hora_inicio: string;
  servicio: string;
  personas: number;
  mesa_ids: number[];
  notas: string | null;
  clientes_reservas?: ClienteReservaLite | ClienteReservaLite[] | null;
};

function getCliente(row: ReservaConfirmationRow): ClienteReservaLite {
  const cliente = row.clientes_reservas;
  if (Array.isArray(cliente)) return cliente[0] ?? {};
  return cliente ?? {};
}

export async function POST(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json().catch(() => ({})) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Falta id de reserva" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const [{ data, error }, { data: config, error: configError }] = await Promise.all([
    supabase
      .from("reservas")
      .select("id, fecha, hora_inicio, servicio, personas, mesa_ids, notas, clientes_reservas(nombre, email)")
      .eq("id", id)
      .single(),
    supabase
      .from("reservas_config")
      .select("telefono")
      .eq("id", 1)
      .single(),
  ]);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });
  }
  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const reserva = data as ReservaConfirmationRow;
  if (isTableBlockReservation(reserva)) {
    return NextResponse.json({ error: "Un bloqueo de mesa no tiene confirmación" }, { status: 409 });
  }

  const cliente = getCliente(reserva);
  const email = cliente.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Esta reserva no tiene email de cliente" }, { status: 409 });
  }

  const result = await sendReservationConfirmationEmail(
    {
      to: email,
      nombre: cliente.nombre ?? "",
      fecha: reserva.fecha,
      hora: reserva.hora_inicio.slice(0, 5),
      servicio: reserva.servicio,
      personas: reserva.personas,
      reservaId: reserva.id,
      mesaIds: reserva.mesa_ids ?? [],
      telefonoRestaurante: config?.telefono ?? null,
    },
    { idempotencyKey: reservationConfirmationResendKey(reserva.id) },
  );

  if (!result.sent) {
    const message = result.reason === "missing_config"
      ? "Falta configurar el servicio de email"
      : result.reason === "invalid_recipient"
        ? "El email del cliente no es válido"
        : "No se pudo enviar la confirmación";
    return NextResponse.json(
      { error: message, reason: result.reason, detail: result.error },
      { status: 502 },
    );
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("reservas")
    .update({ confirmation_email_sent_at: sentAt })
    .eq("id", reserva.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentAt });
}
