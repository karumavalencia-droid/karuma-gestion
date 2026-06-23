import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname === "/reservas" ||
    pathname.startsWith("/reservas/") ||
    pathname.startsWith("/api/reservas/") ||
    pathname.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
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
    if (!user.employeeId && pathname === "/my-attendance") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (
      user.employeeId &&
      pathname !== "/my-attendance" &&
      !pathname.startsWith("/api/attendance/me")
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
