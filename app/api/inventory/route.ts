import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ configured: false, items: [] }, { status: 503 });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim();
  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { configured: true, items: [], error: error.message },
      { status: error.code === "42P01" ? 503 : 500 },
    );
  }

  return NextResponse.json({ configured: true, items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name requerido" }, { status: 400 });

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      name,
      category: typeof body.category === "string" ? body.category : "Otros",
      unit: typeof body.unit === "string" ? body.unit : "ud",
      current_quantity: Number(body.current_quantity) || 0,
      minimum_quantity: Number(body.minimum_quantity) || 0,
      unit_cost: Number(body.unit_cost) || 0,
      supplier_name: typeof body.supplier_name === "string" ? body.supplier_name : "",
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
