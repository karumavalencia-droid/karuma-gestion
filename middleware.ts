import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";
import { handleOwnerRoutes, isOwnerScopedPath } from "@/lib/owner/middleware-gate";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
]);

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
