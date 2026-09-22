import { NextResponse } from "next/server";
import { completePasswordChange } from "@/lib/auth/employee-account";
import { isValidRole } from "@/lib/auth/permissions";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { email?: string; verificationId?: string; code?: string; password?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const result = await completePasswordChange({
    verificationId: body.verificationId ?? "",
    code: body.code ?? "",
    password: body.password ?? "",
    purpose: "password_reset",
    email: body.email ?? "",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!isValidRole(result.role)) return NextResponse.json({ error: "Rol inválido" }, { status: 500 });

  const token = await createSessionToken({
    name: result.name,
    email: result.email,
    role: result.role,
    employeeId: result.employeeKey,
    authMethod: "password",
    sessionVersion: result.sessionVersion,
  });
  const response = NextResponse.json({
    ok: true,
    role: result.role,
    employeeId: result.employeeKey,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
