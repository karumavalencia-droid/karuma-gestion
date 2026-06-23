import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendReservationReviewEmail } from "@/lib/reservas/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ClienteReservaLite = {
  nombre?: string | null;
  email?: string | null;
};

type ReservaReviewRow = {
  id: string;
  clientes_reservas?: ClienteReservaLite | ClienteReservaLite[] | null;
};

function dateInMadrid(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCliente(row: ReservaReviewRow): ClienteReservaLite {
  const cliente = row.clientes_reservas;
  if (Array.isArray(cliente)) return cliente[0] ?? {};
  return cliente ?? {};
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, configured: false, message: "Supabase no configurado" }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const targetDate = requestUrl.searchParams.get("date") || dateInMadrid(-1);
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";

  const { data: config, error: configError } = await supabase
    .from("reservas_config")
    .select("google_review_link")
    .eq("id", 1)
    .single();

  if (configError) {
    return NextResponse.json({ success: false, error: configError.message }, { status: 500 });
  }

  const reviewLink = config?.google_review_link?.trim();
  if (!reviewLink) {
    return NextResponse.json(
      { success: false, configured: false, message: "Configura google_review_link en reservas_config" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("reservas")
    .select("id, clientes_reservas(nombre, email)")
    .eq("fecha", targetDate)
    .eq("estado", "Finalizada")
    .is("review_email_sent_at", null)
    .limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ReservaReviewRow[];
  let sent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const failedIds: string[] = [];
  const pending = rows.map((row) => {
    const cliente = getCliente(row);
    return { id: row.id, email: cliente.email ?? null, nombre: cliente.nombre ?? "" };
  });

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      date: targetDate,
      candidates: rows.length,
      pending,
    });
  }

  for (const row of rows) {
    const cliente = getCliente(row);
    const email = cliente.email?.trim();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }

    const result = await sendReservationReviewEmail({
      to: email,
      nombre: cliente.nombre ?? "",
      reservaId: row.id,
      reviewLink,
    });

    if (!result.sent) {
      failed += 1;
      failedIds.push(row.id);
      continue;
    }

    const { error: updateError } = await supabase
      .from("reservas")
      .update({ review_email_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateError) {
      failed += 1;
      failedIds.push(row.id);
      continue;
    }

    sent += 1;
  }

  return NextResponse.json({
    success: failed === 0,
    date: targetDate,
    candidates: rows.length,
    sent,
    skippedNoEmail,
    failed,
    failedIds,
  });
}
