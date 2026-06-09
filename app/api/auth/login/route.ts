import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { findAccount } from "@/lib/auth/accounts";
import type { Role } from "@/lib/auth/permissions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type LoginUser = Pick<DbUser, "email" | "name" | "role_id" | "password_hash">;

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const account = findAccount(email, password);
    if (!account) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }
    return NextResponse.json({
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

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role_id as Role,
  });
}
