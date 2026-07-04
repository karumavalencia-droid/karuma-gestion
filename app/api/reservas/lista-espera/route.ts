import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type EstadoEspera = "esperando" | "sentado" | "cancelado";

// La ruta /api/reservas/* es pública en el middleware (la usa la web de reservas),
// así que el listado y la gestión — que exponen datos de clientes — comprueban
// la sesión de staff aquí mismo.
async function isStaff(req: NextRequest): Promise<boolean> {
  const user = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return Boolean(user && !user.employeeId);
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    fecha?: string; servicio?: string; nombre?: string; telefono?: string;
    personas?: number; notas?: string; origen?: string;
  };

  const fecha = typeof body.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? body.fecha : "";
  const servicio = body.servicio === "comida" || body.servicio === "cena" ? body.servicio : "";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().slice(0, 20) : "";
  const personas = Number.isInteger(body.personas) && body.personas! >= 1 && body.personas! <= 20 ? body.personas! : 0;
  const notas = typeof body.notas === "string" ? body.notas.trim().slice(0, 300) : "";

  if (!fecha || !servicio || !nombre || !telefono || !personas) {
    return NextResponse.json({ error: "Faltan datos: nombre, teléfono, personas, fecha y servicio" }, { status: 422 });
  }

  // El origen 'staff' solo se acepta con sesión; lo demás entra como 'online'.
  const origen = body.origen === "staff" && (await isStaff(req)) ? "staff" : "online";

  const { data, error } = await sb
    .from("lista_espera")
    .insert({ fecha, servicio, nombre, telefono, personas, notas: notas || null, origen })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET(req: NextRequest) {
  if (!(await isStaff(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const fecha = req.nextUrl.searchParams.get("fecha") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 422 });
  }

  const { data, error } = await sb
    .from("lista_espera")
    .select("id, fecha, servicio, nombre, telefono, personas, notas, origen, estado, created_at")
    .eq("fecha", fecha)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entradas: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await isStaff(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; estado?: string };
  const estados: EstadoEspera[] = ["esperando", "sentado", "cancelado"];
  const estado = estados.find((e) => e === body.estado);
  if (!body.id || !estado) {
    return NextResponse.json({ error: "id y estado válidos requeridos" }, { status: 422 });
  }

  const { error } = await sb
    .from("lista_espera")
    .update({ estado })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
