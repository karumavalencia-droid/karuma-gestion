import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionUser } from "./session";

/**
 * Guard del Inbox: owner y encargado, nunca cuentas de empleado.
 *
 * Se aplica en cada endpoint además del bloqueo en middleware, para que la
 * restricción no dependa de una sola capa — mismo criterio que `requireOwner`.
 */
const ROLES_INBOX = new Set<SessionUser["role"]>(["owner", "manager"]);

export async function requireInbox(
  request: NextRequest,
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!user) {
    return { response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  if (user.employeeId || !ROLES_INBOX.has(user.role)) {
    return {
      response: NextResponse.json(
        { error: "Solo propietario y encargado pueden acceder a los mensajes" },
        { status: 403 },
      ),
    };
  }

  return { user };
}
