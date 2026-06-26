import { NextResponse } from "next/server";
import { mapStaffInput, mapStaffRow } from "@/lib/staff/mappers";
import type { StaffInput } from "@/lib/staff/types";
import { STAFF_MEMBERS } from "@/lib/staff/data";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbStaff } from "@/lib/supabase/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(STAFF_MEMBERS);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("name")
    .returns<DbStaff[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapStaffRow));
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Configura las variables de entorno de Supabase" }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const body = (await request.json()) as StaffInput;
  if (!body.name?.trim() || !body.position?.trim() || !body.role) {
    return NextResponse.json({ error: "Nombre, puesto y rol son obligatorios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("staff")
    .insert(mapStaffInput(body))
    .select("*")
    .single()
    .returns<DbStaff>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapStaffRow(data), { status: 201 });
}
