import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });

  const body = (await request.json()) as {
    item_id?: string;
    item_name?: string;
    movement_type?: "entrada" | "salida" | "ajuste";
    quantity?: number;
    note?: string;
  };

  let itemId = body.item_id;
  if (!itemId && body.item_name) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("name", body.item_name.trim())
      .eq("active", true)
      .maybeSingle();
    itemId = data?.id;
  }

  if (!itemId || !body.movement_type || !body.quantity || body.quantity <= 0) {
    return NextResponse.json({ error: "item, movement_type y quantity son obligatorios" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("apply_inventory_movement", {
    p_item_id: itemId,
    p_movement_type: body.movement_type,
    p_quantity: body.quantity,
    p_note: body.note ?? "",
  });

  if (error) {
    const status = /insufficient|not found|invalid|greater than/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ item: data });
}
