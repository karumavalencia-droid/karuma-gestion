import { NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

export async function GET(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json(
        { error: "Missing supplier_id parameter" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_products")
      .select("*")
      .eq("supplier_id", parseInt(supplierId))
      .order("rango", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      supplier_id: supplierId,
      count: data?.length || 0,
      products: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { supplier_id, products } = body;

    if (!supplier_id || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Missing supplier_id or products array" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_products")
      .insert(
        products.map((p: any) => ({
          supplier_id,
          product_name: p.product_name,
          quantity: p.quantity,
          unit: p.unit,
          rango: p.rango,
          invoice_date: p.invoice_date || new Date().toISOString().split("T")[0],
        })),
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      products: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save products" },
      { status: 500 },
    );
  }
}
