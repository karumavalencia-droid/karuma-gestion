import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { findAccount } from "@/lib/auth/accounts";
import type { Role } from "@/lib/auth/permissions";
import { authenticateBuiltInAdmin } from "@/lib/auth/server-accounts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
} from "@/lib/auth/session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type LoginUser = Pick<DbUser, "email" | "name" | "role_id" | "password_hash">;

async function createLoginResponse(user: SessionUser) {
  try {
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
      { error: "登录服务未配置，请设置 KARUMA_AUTH_SECRET" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const builtInAdmin = await authenticateBuiltInAdmin(email, password);
  if (builtInAdmin) return createLoginResponse(builtInAdmin);

  if (process.env.NODE_ENV === "production" && password === "123456") {
    return NextResponse.json(
      { error: "默认演示密码已禁用" },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured()) {
    const account = findAccount(email, password);
    if (!account) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }
    return createLoginResponse({
      name: account.name,
      email: account.email,
      role: account.role,
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("email, name, role_id, password_hash")
    .eq("email", email)
    .maybeSingle()
    .returns<LoginUser>();

  if (error || !user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  return createLoginResponse({
    name: user.name,
    email: user.email,
    role: user.role_id as Role,
  });
}
