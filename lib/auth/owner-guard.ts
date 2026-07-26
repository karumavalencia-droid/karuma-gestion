import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionUser,
} from "./session";

/**
 * Guard para módulos confidenciales (finanzas, documentos): solo el rol
 * owner puede pasar. Se usa en cada endpoint API además del bloqueo en
 * middleware, para que la restricción no dependa de una sola capa.
 */
export async function requireOwner(
  request: NextRequest,
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!user) {
    return {
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  if (user.role !== "owner" || user.employeeId) {
    return {
      response: NextResponse.json(
        { error: "Solo el propietario puede acceder a este módulo" },
        { status: 403 },
      ),
    };
  }

  return { user };
}
