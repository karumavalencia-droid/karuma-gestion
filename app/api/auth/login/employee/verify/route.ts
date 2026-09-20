/**
 * POST /api/auth/login/employee/verify
 *
 * Segundo paso del login del portal del empleado desde el móvil:
 * el primer paso (POST /api/auth/login con el PIN) manda un código SMS al
 * teléfono de la ficha del empleado. Aquí se verifica ese código junto con
 * el PIN y, si todo es válido, se crea la sesión del empleado.
 *
 * Es el gemelo de /api/auth/login/admin/verify: mismo OTP, mismo SMS,
 * misma auditoría. Solo cambia de dónde sale el teléfono (la ficha de
 * `staff` en vez de KARUMA_ADMIN_PHONE) y la credencial (PIN en vez de
 * usuario+contraseña).
 *
 * Body: { "pin": "1001", "code": "123456" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getEmployeeOtpPhone } from "@/lib/auth/employee-otp";
import { resolveEmployeePinUser } from "@/lib/auth/employee-pin-login";
import { verifyOtp } from "@/lib/auth/otp-service";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { logLoginEvent } from "@/lib/auth/supabase-auth";

export async function POST(request: NextRequest) {
  let body: { pin?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const pin = body.pin?.trim() ?? "";
  const code = body.code?.trim() ?? "";
  if (!pin || !code) {
    return NextResponse.json({ error: "PIN y código son obligatorios" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // El PIN se revalida en cada paso: el código SMS solo vale acompañado del
  // PIN correcto, igual que el código del admin solo vale con su contraseña.
  const employeeUser = await resolveEmployeePinUser(pin);
  if (!employeeUser) {
    await logLoginEvent({
      status: "failed",
      loginMethod: "password",
      ip,
      userAgent,
      failureReason: "portal_bad_pin",
    });
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const lookup = await getEmployeeOtpPhone(employeeUser.employeeId);
  if (lookup.status !== "ok") {
    return NextResponse.json(
      { error: "Tu ficha no tiene un móvil válido. Pídeselo al encargado." },
      { status: 409 },
    );
  }

  const otpResult = await verifyOtp(lookup.phone, code);
  if (!otpResult.success) {
    await logLoginEvent({
      status: "failed",
      loginMethod: "otp",
      ip,
      userAgent,
      failureReason: `portal_otp: ${otpResult.error}`,
    });
    return NextResponse.json({ error: otpResult.error }, { status: 400 });
  }

  let token: string;
  try {
    token = await createSessionToken(employeeUser);
  } catch {
    return NextResponse.json(
      { error: "Servicio de login no configurado. Define KARUMA_AUTH_SECRET" },
      { status: 503 },
    );
  }

  await logLoginEvent({
    status: "success",
    loginMethod: "otp",
    ip,
    userAgent,
  });

  const response = NextResponse.json(employeeUser);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
