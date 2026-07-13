/**
 * Guardia de permisos a nivel de API / servidor.
 * Verifica que el usuario autenticado tenga acceso a un módulo específico.
 * RLS se encarga de la privacidad a nivel de fila; esto protege a nivel de endpoint.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUser } from "./guards";
import { canAccessRoute, hasModuleAccess, type Module } from "./permissions";

/**
 * Middleware: redirige a /login si no hay sesión válida.
 */
export async function requireSession(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return null; // Sesión válida, continuar
}

/**
 * Middleware: responde 403 Forbidden si el usuario no tiene permiso para el módulo.
 * Uso:
 *   const guard = await requireModuleAccess('sales', request)
 *   if (guard) return guard // Error: 403
 *   // ... continue with handler
 */
export async function requireModuleAccess(
  module: Module,
  request: NextRequest
) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasModuleAccess(user.role, module)) {
    return NextResponse.json(
      {
        error: "Forbidden",
        detail: `No tienes permiso para acceder a ${module}`,
      },
      { status: 403 }
    );
  }

  return null; // Acceso permitido
}

/**
 * Middleware: responde 403 si el usuario no es Owner.
 */
export async function requireOwner(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "owner") {
    return NextResponse.json(
      {
        error: "Forbidden",
        detail: "Solo el propietario puede acceder aquí",
      },
      { status: 403 }
    );
  }

  return null; // Es Owner
}

/**
 * Middleware: responde 403 si el usuario no puede acceder a la ruta.
 * Combina validación de ruta + módulo.
 */
export async function requireRouteAccess(
  pathname: string,
  request: NextRequest
) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessRoute(user.role, pathname)) {
    return NextResponse.json(
      {
        error: "Forbidden",
        detail: `No tienes permiso para acceder a ${pathname}`,
      },
      { status: 403 }
    );
  }

  return null; // Acceso permitido
}
