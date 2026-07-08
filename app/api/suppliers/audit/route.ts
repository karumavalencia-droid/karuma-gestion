import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let query = supabase
      .from("supplier_product_audit")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      logs: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
