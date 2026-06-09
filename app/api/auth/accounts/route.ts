import { NextResponse } from "next/server";
import { MOCK_ACCOUNTS } from "@/lib/auth/accounts";
import type { Role } from "@/lib/auth/permissions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbUser } from "@/lib/supabase/types";

type UserPreview = Pick<DbUser, "email" | "name" | "role_id">;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      MOCK_ACCOUNTS.map((a) => ({
        email: a.email,
        name: a.name,
        role: a.role,
      })),
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("email, name, role_id")
    .order("name")
    .returns<UserPreview[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role_id as Role,
    })),
  );
}
