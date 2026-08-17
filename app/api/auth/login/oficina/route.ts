import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import {
  oficinaSessionUser,
  verifyOficinaCredentials,
} from "@/lib/auth/server-accounts";

/** Office access is password-only by design; SMS 2FA belongs to admin login. */
export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!(await verifyOficinaCredentials(username, password))) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }

  try {
    const user = oficinaSessionUser();
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
