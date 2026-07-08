import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// GET: obtener recomendaciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get("supplier_id");
    const isActive = searchParams.get("is_active") !== "false";

    let query = supabase
      .from("supplier_recommendations")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    if (isActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      recommendations: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
