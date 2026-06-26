import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendReservationReviewEmail } from "@/lib/reservas/email";
import type { EstadoReserva } from "@/lib/reservas/types";

type ClienteReservaLite = {
  nombre?: string | null;
  email?: string | null;
};

type ReservaReviewRow = {
  id: string;
  estado: EstadoReserva;
  review_email_sent_at: string | null;
  clientes_reservas?: ClienteReservaLite | ClienteReservaLite[] | null;
};

const REVIEW_ALLOWED_STATUSES: EstadoReserva[] = ["Sentado", "Finalizada", "WalkIn"];

function getCliente(row: ReservaReviewRow): ClienteReservaLite {
  const cliente = row.clientes_reservas;
  if (Array.isArray(cliente)) return cliente[0] ?? {};
  return cliente ?? {};
}

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "Falta id de reserva" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { data: config, error: configError } = await supabase
    .from("reservas_config")
    .select("google_review_link")
    .eq("id", 1)
    .single();

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const reviewLink = config?.google_review_link?.trim();
  if (!reviewLink) {
    return NextResponse.json({ error: "Configura el Link Google Review antes de enviar la solicitud." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("reservas")
    .select("id, estado, review_email_sent_at, clientes_reservas(nombre, email)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });
  }

  const reserva = data as ReservaReviewRow;
  if (!REVIEW_ALLOWED_STATUSES.includes(reserva.estado)) {
    return NextResponse.json(
      { error: "La solicitud de reseña solo se puede enviar cuando el cliente está en mesa o la reserva está finalizada." },
      { status: 409 },
    );
  }

  if (reserva.review_email_sent_at) {
    return NextResponse.json({ ok: true, alreadySent: true });
  }

  const cliente = getCliente(reserva);
  const email = cliente.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Esta reserva no tiene email de cliente." }, { status: 409 });
  }

  const result = await sendReservationReviewEmail({
    to: email,
    nombre: cliente.nombre ?? "",
    reservaId: reserva.id,
    reviewLink,
  });

  if (!result.sent) {
    const message = result.reason === "missing_config"
      ? "Falta configurar el servicio de email."
      : result.reason === "invalid_recipient"
        ? "El email del cliente no es válido."
        : "No se pudo enviar el email de reseña.";
    return NextResponse.json({ error: message, reason: result.reason, detail: result.error }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("reservas")
    .update({ review_email_sent_at: sentAt })
    .eq("id", reserva.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentAt });
}
