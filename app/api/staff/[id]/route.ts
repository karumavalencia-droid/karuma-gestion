import { NextResponse } from "next/server";
import { findStaffMember } from "@/lib/staff/data";
import { mapStaffInput, mapStaffRow } from "@/lib/staff/mappers";
import type { StaffInput } from "@/lib/staff/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbStaff } from "@/lib/supabase/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    const member = findStaffMember(id);
    if (!member) {
      return NextResponse.json({ error: "员工不存在" }, { status: 404 });
    }
    return NextResponse.json(member);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .maybeSingle()
    .returns<DbStaff>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "员工不存在" }, { status: 404 });
  }

  return NextResponse.json(mapStaffRow(data));
}

export async function PUT(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "请配置 Supabase 环境变量" }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as StaffInput;

  if (!body.name?.trim() || !body.position?.trim() || !body.role) {
    return NextResponse.json({ error: "姓名、职位和角色为必填项" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("staff")
    .update(mapStaffInput(body))
    .eq("id", id)
    .select("*")
    .single()
    .returns<DbStaff>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapStaffRow(data));
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "请配置 Supabase 环境变量" }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const { id } = await context.params;

  const { error } = await supabase.from("staff").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
