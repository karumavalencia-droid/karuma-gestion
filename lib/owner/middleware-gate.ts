// ─── Gate de middleware para /owner y /security ───────────────────────────────
// Aplica el estado owner+MFA usando Supabase Auth (no el cookie karuma_session).
// Se ejecuta ANTES de la lógica de empleados/gestión del middleware para que el
// flujo del propietario no dependa de karuma_session.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseAuthMiddleware } from "@/lib/supabase/ssr-middleware";
import { deriveOwnerContext } from "./context-core";
import { OWNER_ACTIVITY_COOKIE, checkActivity, signActivity } from "./idle";

/** ¿La ruta pertenece a la zona del propietario (páginas o API)? */
export function isOwnerScopedPath(pathname: string): boolean {
  return (
    pathname === "/owner" ||
    pathname.startsWith("/owner/") ||
    pathname.startsWith("/security/") ||
    pathname.startsWith("/api/owner/") ||
    pathname.startsWith("/api/security/")
  );
}

/** Copia las cookies acumuladas en `from` a una respuesta de redirección. */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

/**
 * Decide qué hacer con una petición a la zona del propietario. Devuelve la
 * respuesta (redirección o `response` con cookies refrescadas). El llamador
 * (middleware) debe devolver este resultado tal cual.
 */
export async function handleOwnerRoutes(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  // Prohibir el cacheo de todo lo servido en la zona privada.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const supabase = getSupabaseAuthMiddleware(request, response);

  // Página de acceso: siempre visible. Solo refresca la sesión si existe.
  if (pathname === "/security/login") {
    if (supabase) await supabase.auth.getUser();
    return response;
  }

  // API: refrescar sesión y dejar que el guard de la ruta devuelva 401/403.
  if (pathname.startsWith("/api/owner/") || pathname.startsWith("/api/security/")) {
    if (supabase) await supabase.auth.getUser();
    return response;
  }

  // Sin Supabase Auth configurado no se puede usar la zona del propietario.
  if (!supabase) {
    return redirectWithCookies(new URL("/login", request.url), response);
  }

  const ctx = await deriveOwnerContext(supabase);
  const go = (path: string) => redirectWithCookies(new URL(path, request.url), response);

  if (ctx.gate === "unauthenticated") return go("/security/login");
  if (ctx.gate === "not_owner") return go("/login");

  if (pathname === "/security/setup-mfa") {
    if (ctx.gate === "ok") return go("/owner");
    if (ctx.gate === "needs_verify") return go("/security/verify-mfa");
    return response; // needs_setup → permitir
  }

  if (pathname === "/security/verify-mfa") {
    if (ctx.gate === "ok") return go("/owner");
    if (ctx.gate === "needs_setup") return go("/security/setup-mfa");
    return response; // needs_verify → permitir
  }

  // Resto de /owner/* y cualquier otra /security/*: exige owner + aal2.
  if (ctx.gate === "needs_setup") return go("/security/setup-mfa");
  if (ctx.gate === "needs_verify") return go("/security/verify-mfa");

  // gate === "ok": comprobar inactividad y refrescar la marca de actividad.
  const activity = await checkActivity(
    request.cookies.get(OWNER_ACTIVITY_COOKIE)?.value,
  );
  if (!activity.valid || activity.expired) return go("/security/verify-mfa");

  response.cookies.set(OWNER_ACTIVITY_COOKIE, await signActivity(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
