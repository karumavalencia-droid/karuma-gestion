/**
 * GET  /api/portal/correo  → ¿le falta el correo a quien ha entrado?
 * POST /api/portal/correo  → guarda el correo en SU ficha de `staff`.
 *
 * La ficha se resuelve siempre desde la sesión firmada (resolvePayrollStaffId),
 * nunca desde la petición: nadie puede tocar la ficha de otro.
 *
 * Si la cuenta no tiene ficha, o la base de datos no responde, el GET contesta
 * que no falta nada. Es a propósito: el portal es por donde se ficha, y un
 * fallo nuestro no puede dejar a nadie sin poder entrar a trabajar.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { literalParaIlike, normalizeStaffEmail } from "@/lib/staff/correo";
import { resolvePayrollStaffId } from "@/lib/staff/payroll-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/auth/session";

const SIN_BLOQUEO = { pendiente: false, email: null as string | null };

async function fichaDelEmpleado(user: SessionUser) {
  const db = getSupabaseAdmin();
  if (!db) return null;
  try {
    const staffId = await resolvePayrollStaffId(user);
    return staffId ? { db, staffId } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  // Solo se le pide a las cuentas de empleado; oficina y admin no lo usan.
  if (!user.employeeId) return NextResponse.json(SIN_BLOQUEO);

  const ficha = await fichaDelEmpleado(user);
  if (!ficha) {
    console.warn(`[portal-correo] ${user.employeeId}: sin ficha de staff; no se pide el correo`);
    return NextResponse.json(SIN_BLOQUEO);
  }

  const { data, error } = await ficha.db
    .from("staff")
    .select("email")
    .eq("id", ficha.staffId)
    .maybeSingle();

  if (error) {
    console.error("[portal-correo] no se pudo leer la ficha:", error);
    return NextResponse.json(SIN_BLOQUEO);
  }

  const email = normalizeStaffEmail(data?.email ?? null);
  return NextResponse.json({ pendiente: !email, email });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  if (!user.employeeId) {
    return NextResponse.json(
      { error: "Solo las cuentas de empleado tienen ficha" },
      { status: 403 },
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const email = normalizeStaffEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: "Escribe un correo válido, por ejemplo tunombre@gmail.com" },
      { status: 400 },
    );
  }

  const ficha = await fichaDelEmpleado(user);
  if (!ficha) {
    return NextResponse.json(
      { error: "Tu cuenta no está enlazada con ninguna ficha. Avisa al encargado." },
      { status: 409 },
    );
  }

  // Dos personas con el mismo buzón harían imposible saber a quién se escribe.
  const { data: repetido, error: errorRepetido } = await ficha.db
    .from("staff")
    .select("id")
    .ilike("email", literalParaIlike(email))
    .neq("id", ficha.staffId)
    .limit(1);

  if (errorRepetido) {
    console.error("[portal-correo] no se pudo comprobar duplicados:", errorRepetido);
    return NextResponse.json(
      { error: "No se pudo guardar ahora mismo. Inténtalo otra vez." },
      { status: 503 },
    );
  }
  if (repetido?.length) {
    return NextResponse.json(
      { error: "Ese correo ya está en la ficha de otra persona." },
      { status: 409 },
    );
  }

  const { error } = await ficha.db
    .from("staff")
    .update({ email })
    .eq("id", ficha.staffId);

  if (error) {
    console.error("[portal-correo] no se pudo guardar el correo:", error);
    return NextResponse.json(
      { error: "No se pudo guardar ahora mismo. Inténtalo otra vez." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
