import { resolveEmployeePinUser } from "@/lib/auth/employee-pin-login";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { findAccount } from "@/lib/auth/accounts";
import { isMobileUserAgent } from "@/lib/auth/device";
import { getEmployeeOtpEmail, maskEmployeeEmail } from "@/lib/auth/employee-otp";
import { requestEmailOtp, requestOtp } from "@/lib/auth/otp-service";
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
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
} from "@/lib/auth/session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type LoginUser = Pick<
  DbUser,
  "email" | "name" | "role_id" | "password_hash" | "employee_key"
>;

const OFFICE_USERNAME = "oficina";
// bcrypt hash for the shared Oficina password. Keep the plain password out of source.
const OFFICE_PASSWORD_HASH =
  process.env.KARUMA_OFFICE_PASSWORD_HASH ??
  "$2b$12$QNOYQVf6EliFd6lNg96AKOe0mrE0bHQ1lDYxGQ7crneN5dt6vuSei";

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

  // Shared office account: intentionally limited to manager permissions.
  if (username === OFFICE_USERNAME) {
    const validOfficePassword = await bcrypt.compare(password, OFFICE_PASSWORD_HASH);
    if (!validOfficePassword) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    return createLoginResponse({
      name: "Oficina",
      email: "oficina@karuma.local",
      role: "manager",
      employeeId: null,
    });
  }

  if (await verifyAdminCredentials(username, password)) {
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

  // Portal del empleado (PIN). Desde el MÓVIL se pide además un código que
  // se manda por correo a la dirección de su ficha, igual que el admin hace
  // contraseña + código. Desde la tablet del local o el ordenador de oficina
  // sigue bastando el PIN.
  if (/^\d{4,8}$/.test(username) && username === password.trim()) {
    const employeeUser = await resolveEmployeePinUser(username);
    if (employeeUser) {
      if (!isMobileUserAgent(request.headers.get("user-agent"))) {
        return createLoginResponse(employeeUser);
      }

      const lookup = await getEmployeeOtpEmail(employeeUser.employeeId);
      if (lookup.status !== "ok") {
        // Sin correo utilizable en la ficha no hay a dónde mandar el código.
        // Entra solo con el PIN (si no, se quedaría sin poder fichar) y se
        // deja constancia en el log de a quién le falta la dirección.
        console.warn(
          `[portal-otp] ${employeeUser.employeeId}: ${lookup.status} en su ficha de staff; entra solo con PIN`,
        );
        return createLoginResponse(employeeUser);
      }

      const otp = await requestEmailOtp(lookup.email);
      if (!otp.success) {
        return NextResponse.json(
          { error: otp.error || "No se pudo enviar el código por correo" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        requiresOtp: true,
        expiresIn: otp.expiresIn,
        destinationHint: maskEmployeeEmail(lookup.email),
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
