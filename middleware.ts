import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminSession } from "@/lib/auth/admin-session";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";
import { handleOwnerRoutes, isOwnerScopedPath } from "@/lib/owner/middleware-gate";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login/otp/request",
  "/api/auth/login/otp/verify",
  "/api/auth/register",
  "/api/auth/session",
  "/api/auth/logout",
  // Id del despliegue activo: lo consulta cualquier pestaña, también la de
  // login, para avisar de que hay una versión nueva. No expone nada nuevo (ese
  // id ya viaja en la query ?dpl= de los assets).
  "/api/version",
]);

// Módulos confidenciales: SOLO la sesión de Admin (usuario + contraseña + SMS).
// No basta el rol owner: las cuentas de oficina entran por OTP con el rol de su
// ficha, y la única que existe hoy tiene rol owner, así que filtrar por rol no
// las dejaría fuera.
const ADMIN_ONLY_PREFIXES = [
  "/ceo",
  "/ai-gerente",
  "/datos",
  "/objetivo",
  "/profit",
  "/finanzas",
  "/documentos",
  // APIs que alimentan solo a esos módulos. /api/sales/daily NO entra: lo usa
  // el dashboard, que la oficina sí ve.
  "/api/ceo",
  "/api/sales/status",
  "/api/sales/import",
  "/api/sales/migrate-blob",
  "/api/gastos",
  "/api/documentos",
  "/api/finanzas",
];

// Inbox (mensajes y reseñas): gestión, nunca cuentas de empleado.
const GESTION_ONLY_PREFIXES = ["/mensajes", "/api/inbox"];
const ROLES_GESTION = new Set(["owner", "manager"]);

// Portal del empleado: rutas permitidas para cuentas con employeeId.
const EMPLOYEE_PAGES = new Set([
  "/my-attendance",
  "/my-schedule",
  "/announcements",
  "/coach",
]);
const EMPLOYEE_API_PREFIXES = [
  "/api/attendance/me",
  "/api/attendance/colleagues",
  "/api/schedule/me",
  "/api/announcements/me",
  "/api/coach/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    // Endpoints de login (OTP, admin 2FA, registro): siempre públicos.
    pathname.startsWith("/api/auth/login") ||
    pathname === "/api/auth/register" ||
    pathname === "/reservas" ||
    pathname.startsWith("/reservas/") ||
    pathname.startsWith("/api/reservas/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/stock/import-template" ||
    pathname === "/api/stock/from-invoices"
  ) {
    return NextResponse.next();
  }

  // Zona del propietario (/owner, /security, /api/owner, /api/security): se
  // gestiona con Supabase Auth + MFA, no con el cookie karuma_session. Debe ir
  // ANTES de la lógica de empleados/gestión de abajo.
  if (isOwnerScopedPath(pathname)) {
    return handleOwnerRoutes(request, NextResponse.next({ request }));
  }

  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (
    pathname === "/api/attendance/kiosk" ||
    pathname === "/kiosk" ||
    pathname.startsWith("/kiosk/")
  ) {
    if (user?.employeeId && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/my-attendance", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return user
      ? NextResponse.redirect(
          new URL(user.employeeId ? "/my-attendance" : "/dashboard", request.url),
        )
      : NextResponse.next();
  }

  if (user) {
    // Módulos confidenciales: solo la sesión de Admin.
    if (
      ADMIN_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ) &&
      !isAdminSession(user)
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Solo el administrador puede acceder a este módulo" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Inbox: owner y encargado. Los endpoints repiten la comprobación con
    // requireInbox, para no depender de una sola capa.
    if (
      GESTION_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ) &&
      (!ROLES_GESTION.has(user.role) || user.employeeId)
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Solo propietario y encargado pueden acceder a los mensajes" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Los anuncios (tablero de traspaso) y Karuma Coach también son visibles
    // para cuentas de gestión.
    if (
      !user.employeeId &&
      EMPLOYEE_PAGES.has(pathname) &&
      pathname !== "/announcements" &&
      pathname !== "/coach"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (
      user.employeeId &&
      !EMPLOYEE_PAGES.has(pathname) &&
      !EMPLOYEE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "当前员工账号只能使用个人打卡功能" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/my-attendance", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
