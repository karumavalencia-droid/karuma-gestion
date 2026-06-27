import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendReservationReminderEmail } from "@/lib/reservas/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FALLBACK_TEL = "+34676706776";

type ClienteReservaLite = {
  nombre?: string | null;
  email?: string | null;
};

type ReservaReminderRow = {
  id: string;
  fecha: string;
  hora_inicio: string;
  personas: number;
  clientes_reservas?: ClienteReservaLite | ClienteReservaLite[] | null;
};

// Fecha (YYYY-MM-DD) en zona horaria de Madrid, con desplazamiento de días.
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

function getCliente(row: ReservaReminderRow): ClienteReservaLite {
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
  // Por defecto: reservas de MAÑANA (recordatorio el día antes).
  const targetDate = requestUrl.searchParams.get("date") || dateInMadrid(1);
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";

  const { data: config } = await supabase
    .from("reservas_config")
    .select("telefono")
    .eq("id", 1)
    .single();
  const telefono = config?.telefono?.trim() || FALLBACK_TEL;

  const { data, error } = await supabase
    .from("reservas")
    .select("id, fecha, hora_inicio, personas, clientes_reservas(nombre, email)")
    .eq("fecha", targetDate)
    .eq("estado", "Confirmada")
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ReservaReminderRow[];

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      date: targetDate,
      candidates: rows.length,
      pending: rows.map((row) => ({ id: row.id, email: getCliente(row).email ?? null })),
    });
  }

  let sent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (const row of rows) {
    const cliente = getCliente(row);
    const email = cliente.email?.trim();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }

    const result = await sendReservationReminderEmail({
      to: email,
      nombre: cliente.nombre ?? "",
      fecha: row.fecha,
      hora: String(row.hora_inicio ?? "").slice(0, 5),
      personas: row.personas,
      reservaId: row.id,
      telefonoRestaurante: telefono,
    });

    if (!result.sent) {
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
