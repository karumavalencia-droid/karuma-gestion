/**
 * Construcción de la sesión para las cuentas de oficina (login por teléfono).
 *
 * Se comparte entre los dos caminos que pueden autenticar a una de estas
 * cuentas: verificar el código SMS (`/api/auth/login/otp/verify`) y entrar
 * desde un dispositivo de confianza (`/api/auth/login/otp/request`).
 */

import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "./permissions";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "./session";
import {
  getAccountByPhone,
  getOrCreateSession,
  logLoginEvent,
  updateLastLogin,
} from "./supabase-auth";

export async function buildOtpLoginResponse(
  request: NextRequest,
  phone: string,
  options: { trustedDevice?: boolean } = {},
): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  const account = await getAccountByPhone(phone);

  if (!account) {
    await logLoginEvent({
      status: "failed",
      loginMethod: "otp",
      ip,
      userAgent,
      failureReason: "Cuenta no encontrada",
    });

    return NextResponse.json(
      { success: false, error: "Error al encontrar la cuenta" },
      { status: 500 },
    );
  }

  if (account.status !== "active") {
    await logLoginEvent({
      accountId: account.id,
      status: "failed",
      loginMethod: "otp",
      ip,
      userAgent,
      failureReason: `account_${account.status}`,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Tu cuenta está deshabilitada. Contacta al administrador.",
      },
      { status: 403 },
    );
  }

  // Sesión de dispositivo (para el panel de dispositivos y el logout).
  const deviceId =
    request.cookies.get("device-id")?.value || `device_${Date.now()}`;
  await getOrCreateSession({
    accountId: account.id,
    deviceId,
    ip,
    // `deviceName` ya lleva el user-agent: getOrCreateSession no acepta un
    // campo `userAgent` suelto (el original lo pasaba y se descartaba).
    deviceName: userAgent,
  });

  await updateLastLogin(account.id, ip);

  const sessionToken = await createSessionToken({
    name: account.display_name,
    email: account.auth_user_id, // Usar auth_user_id como email provisional
    role: (account.role_id as Role) || "staff", // Cast según tipos actuales
    employeeId: null, // Por ahora, solo cuentas de usuario, no de empleado
  });

  await logLoginEvent({
    accountId: account.id,
    status: "success",
    loginMethod: "otp",
    ip,
    userAgent,
    deviceInfo: options.trustedDevice
      ? { trustedDevice: true, skipped2fa: true }
      : null,
  });

  const response = NextResponse.json(
    {
      success: true,
      isNewUser: false,
      trustedDevice: options.trustedDevice === true,
      user: {
        displayName: account.display_name,
        role: account.role_id,
      },
    },
    { status: 200 },
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    ...sessionCookieOptions(),
  });

  // Guardar device-id si aún no existe.
  if (!request.cookies.get("device-id")) {
    response.cookies.set({
      name: "device-id",
      value: deviceId,
      maxAge: 365 * 24 * 60 * 60, // 1 año
      httpOnly: false, // Accesible desde JS para device fingerprinting
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
