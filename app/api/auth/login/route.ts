import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { findEmployeeIdByAttendancePin } from "@/lib/attendance/employee-pins";
import { findAccount } from "@/lib/auth/accounts";
import { requestOtp } from "@/lib/auth/otp-service";
import type { Role } from "@/lib/auth/permissions";
import {
  adminSessionUser,
  getAdminPhone,
  maskPhone,
  verifyAdminCredentials,
} from "@/lib/auth/server-accounts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  type SessionUser,
} from "@/lib/auth/session";
import {
  adminDeviceSubject,
  isDeviceTrustedFor,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "@/lib/auth/trusted-device";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import { findStaffMember } from "@/lib/staff/data";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type LoginUser = Pick<
  DbUser,
  "email" | "name" | "role_id" | "password_hash" | "employee_key"
>;

async function createLoginResponse(user: SessionUser, extra?: Record<string, unknown>) {
  try {
    const token = await createSessionToken(user);
    const response = NextResponse.json({ ...user, ...extra });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Servicio de login no configurado. Define KARUMA_AUTH_SECRET" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
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

  if (await verifyAdminCredentials(username, password)) {
    // Dispositivo de confianza: la contraseña ya cubre el primer factor y este
    // navegador superó el SMS hace menos de 30 días, así que no lo repetimos.
    const trusted = await isDeviceTrustedFor(
      request.cookies.get(TRUSTED_DEVICE_COOKIE_NAME)?.value,
      adminDeviceSubject(username),
    );

    if (trusted) {
      // Auditoría best-effort: importación dinámica porque supabase-auth crea
      // su cliente al importarse y este endpoint debe funcionar sin Supabase.
      try {
        const { logLoginEvent } = await import("@/lib/auth/supabase-auth");
        await logLoginEvent({
          status: "success",
          loginMethod: "password",
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          deviceInfo: { trustedDevice: true, skipped2fa: true },
        });
      } catch {
        // Sin Supabase configurado no hay log; el login sigue siendo válido.
      }

      return createLoginResponse(adminSessionUser(), { trustedDevice: true });
    }

    const adminPhone = getAdminPhone();

    if (!adminPhone) {
      // Producción exige 2FA por SMS; sin teléfono configurado no hay admin.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Cuenta admin sin teléfono configurado (KARUMA_ADMIN_PHONE)" },
          { status: 503 },
        );
      }
      // Solo en desarrollo: acceso directo con contraseña.
      return createLoginResponse(adminSessionUser());
    }

    const otp = await requestOtp(adminPhone);
    if (!otp.success) {
      return NextResponse.json(
        { error: otp.error || "No se pudo enviar el código SMS" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      requiresOtp: true,
      expiresIn: otp.expiresIn,
      phoneHint: maskPhone(adminPhone),
    });
  }

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
