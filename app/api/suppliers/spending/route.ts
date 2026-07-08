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
    const yearMonth = url.searchParams.get("year_month"); // YYYY-MM

    let query = supabase
      .from("supplier_spending_summary")
      .select("*")
      .order("year_month", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    if (yearMonth) {
      query = query.eq("year_month", yearMonth);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calcular totales
    const total_quantity = data?.reduce(
      (sum, row) => sum + parseFloat(String(row.total_quantity || 0)),
      0,
    );
    const total_cost = data?.reduce(
      (sum, row) => sum + parseFloat(String(row.total_cost || 0)),
      0,
    );

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      summary: data || [],
      totals: {
        total_quantity,
        total_cost,
      },
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
    const body = await request.json();
    const {
      supplier_id,
      year_month,
      total_quantity,
      total_cost,
      product_count,
    } = body;

    if (!supplier_id || !year_month) {
      return NextResponse.json(
        { error: "Falta supplier_id o year_month" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_spending_summary")
      .upsert(
        {
          supplier_id,
          year_month,
          total_quantity,
          total_cost,
          product_count,
        },
        { onConflict: "supplier_id,year_month" },
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: data?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
