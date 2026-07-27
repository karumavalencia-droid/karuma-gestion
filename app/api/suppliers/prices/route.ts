import { NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

export async function GET(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");
    const productId = url.searchParams.get("product_id");

    let query = supabase
      .from("supplier_product_prices")
      .select("*")
      .order("effective_date", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    if (productId) {
      query = query.eq("supplier_product_id", parseInt(productId));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      prices: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const {
      supplier_product_id,
      supplier_id,
      product_name,
      unit_price,
      currency,
      effective_date,
      notes,
    } = body;

    if (!supplier_product_id || !unit_price) {
      return NextResponse.json(
        { error: "Falta supplier_product_id o unit_price" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_product_prices")
      .insert({
        supplier_product_id,
        supplier_id,
        product_name,
        unit_price,
        currency: currency || "EUR",
        effective_date: effective_date || new Date().toISOString().split("T")[0],
        notes,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      price: data?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
