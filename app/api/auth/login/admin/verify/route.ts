/**
 * POST /api/auth/login/admin/verify
 *
 * Segundo paso del login de administrador (2FA):
 * el primer paso (POST /api/auth/login con usuario+contraseña) envía un
 * código SMS al teléfono del admin (KARUMA_ADMIN_PHONE). Aquí se verifica
 * ese código junto con las credenciales y, si todo es válido, se crea la
 * sesión con rol owner.
 *
 * Body: { "username": "...", "password": "...", "code": "123456" }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp-service";
import {
  adminSessionUser,
  getAdminPhone,
  verifyAdminCredentials,
} from "@/lib/auth/server-accounts";
import { logLoginEvent } from "@/lib/auth/supabase-auth";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  addTrustedSubject,
  adminDeviceSubject,
  TRUSTED_DEVICE_COOKIE_NAME,
  trustedDeviceCookieOptions,
} from "@/lib/auth/trusted-device";

export async function POST(request: NextRequest) {
  let body: {
    username?: string;
    password?: string;
    code?: string;
    trustDevice?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const { username, password, code, trustDevice } = body;
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

  // Las credenciales se re-verifican en cada paso: el código SMS solo
  // vale acompañado de la contraseña correcta.
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

  const adminPhone = getAdminPhone();
  if (!adminPhone) {
    return NextResponse.json(
      { error: "Cuenta admin sin teléfono configurado (KARUMA_ADMIN_PHONE)" },
      { status: 503 },
    );
  }

  const otpResult = await verifyOtp(adminPhone, code);
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
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

  // "Recordar este dispositivo": los próximos 30 días bastará la contraseña.
  if (trustDevice) {
    const trustedToken = await addTrustedSubject(
      request.cookies.get(TRUSTED_DEVICE_COOKIE_NAME)?.value,
      adminDeviceSubject(username),
    );
    if (trustedToken) {
      response.cookies.set(
        TRUSTED_DEVICE_COOKIE_NAME,
        trustedToken,
        trustedDeviceCookieOptions(),
      );
    }
  }

  return response;
}
