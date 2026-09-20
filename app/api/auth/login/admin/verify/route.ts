/**
 * POST /api/auth/login/admin/verify
 *
 * Segundo paso del login de administrador (2FA):
 * el primer paso (POST /api/auth/login con usuario+contraseña) envía un
 * código al correo del admin (KARUMA_ADMIN_EMAIL) o, de respaldo, por SMS a
 * su teléfono (KARUMA_ADMIN_PHONE). Aquí se verifica ese código junto con
 * las credenciales y, si todo es válido, se crea la sesión con rol owner.
 *
 * Body: { "username": "...", "password": "...", "code": "123456",
 *         "channel": "email" | "sms" }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp-service";
import {
  adminSessionUser,
  getAdminEmail,
  getAdminPhone,
  verifyAdminCredentials,
} from "@/lib/auth/server-accounts";
import { logLoginEvent } from "@/lib/auth/supabase-auth";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

/**
 * A qué destino se mandó el código. El cliente solo dice por qué CANAL lo
 * recibió; la dirección sale siempre del servidor, nunca de la petición.
 * Sin canal (apps antiguas) se asume el preferente: correo y, si no hay,
 * teléfono.
 */
function resolveOtpDestination(channel: string | undefined): string | null {
  const email = getAdminEmail();
  const phone = getAdminPhone();
  if (channel === "sms") return phone;
  if (channel === "email") return email;
  return email ?? phone;
}

export async function POST(request: NextRequest) {
  let body: {
    username?: string;
    password?: string;
    code?: string;
    channel?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const { username, password, code, channel } = body;
  if (!username || !password || !code) {
    return NextResponse.json(
      { error: "Usuario, contraseña y código son obligatorios" },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Las credenciales se re-verifican en cada paso: el código solo vale
  // acompañado de la contraseña correcta.
  if (!(await verifyAdminCredentials(username, password))) {
    await logLoginEvent({
      status: "failed",
      loginMethod: "password",
      ip,
      userAgent,
      failureReason: "admin_bad_credentials",
    });
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const destino = resolveOtpDestination(channel);
  if (!destino) {
    return NextResponse.json(
      { error: "Cuenta admin sin correo configurado (KARUMA_ADMIN_EMAIL)" },
      { status: 503 },
    );
  }

  const otpResult = await verifyOtp(destino, code);
  if (!otpResult.success) {
    await logLoginEvent({
      status: "failed",
      loginMethod: "password",
      ip,
      userAgent,
      failureReason: `admin_otp: ${otpResult.error}`,
    });
    return NextResponse.json({ error: otpResult.error }, { status: 400 });
  }

  const user = adminSessionUser();

  let token: string;
  try {
    token = await createSessionToken(user);
  } catch {
    return NextResponse.json(
      { error: "Servicio de login no configurado. Define KARUMA_AUTH_SECRET" },
      { status: 503 },
    );
  }

  await logLoginEvent({
    status: "success",
    loginMethod: "password",
    ip,
    userAgent,
  });

  const response = NextResponse.json(user);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
