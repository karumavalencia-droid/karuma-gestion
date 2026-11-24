import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendReservationConfirmationEmail } from "@/lib/reservas/email";
import { isTableBlockReservation } from "@/lib/reservas/helpers";
import { isReservationStaffRequest } from "@/lib/reservas/security";
import { precioBuffet, PRECIO_FIN_DE_SEMANA } from "@/lib/reservas/precio";

// Reenvía la confirmación, con un aviso del precio de 26,50 €, a las reservas
// futuras confirmadas que caen en tarifa de fin de semana o festivo
// (viernes noche, sábado, domingo y festivos). No incluye Nochebuena/Nochevieja
// (cena), Navidad ni Año Nuevo, que tienen tarifa especial de 29,90 €.
// GET → vista previa (no envía nada). POST { ids } → envía a esas reservas.

const AVISO =
  "Te recordamos que tu reserva es en fin de semana o festivo: el precio del buffet ese día es de 26,50 € por persona (bebidas no incluidas).";
const ASUNTO = "Confirmación de tu reserva y precio del buffet - Karuma Sushi & Grill";

type ClienteLite = { nombre?: string | null; email?: string | null };
type Row = {
  id: string;
  fecha: string;
  hora_inicio: string;
  servicio: string;
  personas: number;
  mesa_ids: number[] | null;
  notas: string | null;
  estado: string;
  clientes_reservas?: ClienteLite | ClienteLite[] | null;
};

function cliente(row: Row): ClienteLite {
  const c = row.clientes_reservas;
  return Array.isArray(c) ? c[0] ?? {} : c ?? {};
}

function hoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

async function candidatas() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Supabase no configurado" as const };
  const { data, error } = await supabase
    .from("reservas")
    .select("id, fecha, hora_inicio, servicio, personas, mesa_ids, notas, estado, clientes_reservas(nombre, email)")
    .gte("fecha", hoyMadrid())
    .eq("estado", "Confirmada")
    .order("fecha")
    .order("hora_inicio");
  if (error) return { error: error.message };
  const rows = ((data ?? []) as Row[]).filter((r) =>
    !isTableBlockReservation(r)
    && Boolean(cliente(r).email?.trim())
    && precioBuffet(r.fecha, String(r.hora_inicio).slice(0, 5)) === PRECIO_FIN_DE_SEMANA,
  );
  return { supabase, rows };
}

export async function GET(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const res = await candidatas();
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({
    total: res.rows.length,
    reservas: res.rows.map((r) => ({
      id: r.id, fecha: r.fecha, hora: String(r.hora_inicio).slice(0, 5), personas: r.personas,
      nombre: cliente(r).nombre ?? "", email: cliente(r).email ?? "",
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "Faltan reservas" }, { status: 400 });

  const res = await candidatas();
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 500 });
  const { data: config } = await res.supabase.from("reservas_config").select("telefono").eq("id", 1).single();

  const pedidas = new Set(ids);
  const enviadas: string[] = [];
  const fallidas: { id: string; error: string }[] = [];
  for (const r of res.rows.filter((row) => pedidas.has(row.id))) {
    const c = cliente(r);
    const result = await sendReservationConfirmationEmail(
      {
        to: c.email!.trim(),
        nombre: c.nombre ?? "",
        fecha: r.fecha,
        hora: String(r.hora_inicio).slice(0, 5),
        servicio: r.servicio,
        personas: r.personas,
        reservaId: r.id,
        mesaIds: r.mesa_ids ?? [],
        telefonoRestaurante: config?.telefono ?? null,
        aviso: AVISO,
        asunto: ASUNTO,
      },
      { idempotencyKey: `aviso-precio-finde-2650-${r.id}` },
    );
    if (result.sent) {
      enviadas.push(r.id);
      await res.supabase.from("reservas").update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", r.id);
    } else {
      fallidas.push({ id: r.id, error: result.error ?? result.reason });
    }
  }
  return NextResponse.json({ ok: true, enviadas: enviadas.length, fallidas });
}
