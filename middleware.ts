import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** 权限 middleware 已临时禁用，直接放行所有请求 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
