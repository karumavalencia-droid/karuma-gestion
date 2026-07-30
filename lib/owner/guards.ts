// ─── Guard de API para la zona privada ────────────────────────────────────────
// Uso en cada route handler de /api/owner/*:
//   const guard = await requireOwnerApi();
//   if (!guard.ok) return guard.response;
//   // ... guard.ctx es owner + aal2 + sesión activa (no inactiva)
//
// 401 = sin sesión Supabase Auth. 403 = autenticado pero sin owner+aal2, o
// sesión caducada por inactividad (re-verificar MFA).

import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOwnerContext, type OwnerContext } from "./session";
import { OWNER_ACTIVITY_COOKIE, checkActivity, signActivity } from "./idle";
import { allowOwnerRequest } from "./rate-limit";

/** Cabeceras para prohibir el cacheo de páginas/API sensibles. */
export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

function err(status: number, error: string, message: string): NextResponse {
  return NextResponse.json({ error, message }, { status, headers: NO_STORE_HEADERS });
}

export type OwnerGuardResult =
  | { ok: true; ctx: OwnerContext }
  | { ok: false; response: NextResponse };

/**
 * Exige owner + aal2 + sesión activa. Devuelve el contexto o una respuesta de
 * error ya lista (401/403). No revela detalles internos.
 */
export async function requireOwnerApi(): Promise<OwnerGuardResult> {
  const ctx = await getOwnerContext();

  if (ctx.gate === "unauthenticated") {
    return { ok: false, response: err(401, "not_authenticated", "Inicia sesión.") };
  }
  if (ctx.gate === "not_owner") {
    return { ok: false, response: err(403, "forbidden", "Acceso restringido.") };
  }
  if (ctx.gate !== "ok") {
    return {
      ok: false,
      response: err(403, "mfa_required", "Verificación en dos pasos requerida."),
    };
  }

  // Inactividad: 15 min sin actividad => re-verificar.
  const store = await cookies();
  const activity = await checkActivity(store.get(OWNER_ACTIVITY_COOKIE)?.value);
  if (!activity.valid || activity.expired) {
    return {
      ok: false,
      response: err(403, "reauth_required", "Sesión inactiva. Vuelve a verificar."),
    };
  }

  // Rate limit básico por propietario (defensa frente a abuso de la sesión).
  if (ctx.userId && !allowOwnerRequest(`owner:${ctx.userId}`)) {
    return {
      ok: false,
      response: err(429, "rate_limited", "Demasiadas peticiones. Espera un momento."),
    };
  }

  return { ok: true, ctx };
}

/** Refresca la marca de actividad del propietario en una respuesta. */
export async function touchOwnerActivity(response: NextResponse): Promise<NextResponse> {
  response.cookies.set(OWNER_ACTIVITY_COOKIE, await signActivity(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // se renueva en cada acción; el límite real es la inactividad
  });
  return response;
}

/** Respuesta JSON sensible con no-store + refresco de actividad. */
export async function ownerJson(
  data: unknown,
  init?: { status?: number },
): Promise<NextResponse> {
  const response = NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: NO_STORE_HEADERS,
  });
  return touchOwnerActivity(response);
}
