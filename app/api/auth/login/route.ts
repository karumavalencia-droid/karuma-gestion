import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { findEmployeeIdByAttendancePin } from "@/lib/attendance/employee-pins";
import { findAccount } from "@/lib/auth/accounts";
import type { Role } from "@/lib/auth/permissions";
import { authenticateBuiltInAdmin } from "@/lib/auth/server-accounts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
} from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import { findStaffMember } from "@/lib/staff/data";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type LoginUser = Pick<
  DbUser,
  "email" | "name" | "role_id" | "password_hash" | "employee_key"
>;

async function createLoginResponse(user: SessionUser) {
  try {
    const token = await createSessionToken(user);
    const response = NextResponse.json(user);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Servicio de login no configurado. Define KARUMA_AUTH_SECRET" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const username = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
  }

  const builtInAdmin = await authenticateBuiltInAdmin(username, password);
  if (builtInAdmin) return createLoginResponse(builtInAdmin);

  if (/^\d{4}$/.test(username) && username === password.trim()) {
    const employeeId = findEmployeeIdByAttendancePin(username);
    const employee = employeeId ? findKioskEmployee(employeeId) : null;
    const staff = employeeId ? findStaffMember(employeeId) : null;
    if (employee && staff) {
      return createLoginResponse({
        name: employee.name,
        email: `${employeeId}@karuma.local`,
        role: staff.role as Role,
        employeeId,
      });
    }
  }

  if (process.env.NODE_ENV === "production" && password === "123456") {
    return NextResponse.json(
      { error: "La contraseña demo por defecto está desactivada" },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured()) {
    const account = findAccount(username, password);
    if (!account) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }
    return createLoginResponse({
      name: account.name,
      email: account.email,
      role: account.role,
      employeeId: account.employeeId ?? null,
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("email, name, role_id, password_hash, employee_key")
    .eq("email", username)
    .maybeSingle()
    .returns<LoginUser>();

  if (error || !user) {
    return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  }

  return createLoginResponse({
    name: user.name,
    email: user.email,
    role: user.role_id as Role,
    employeeId: user.employee_key,
  });
}
