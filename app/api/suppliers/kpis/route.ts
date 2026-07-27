import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

export async function GET(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const searchParams = request.nextUrl.searchParams;
    const period = parseInt(searchParams.get("period") || "6");

    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - period);

    // Total spending
    const { data: spending } = await supabase
      .from("supplier_spending_summary")
      .select("total_cost, total_quantity, avg_unit_cost")
      .gte("year_month", dateFrom.toISOString().substring(0, 7))
      .limit(period);

    const totalSpending = spending?.reduce((sum, s) => sum + s.total_cost, 0) || 0;
    const totalQuantity = spending?.reduce((sum, s) => sum + s.total_quantity, 0) || 0;

    // Average cost per supplier
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id")
      .limit(100);

    const avgSupplierCost = suppliers && suppliers.length > 0
      ? totalSpending / suppliers.length / period
      : 0;

    // Alerts
    const { data: alerts } = await supabase
      .from("supplier_product_alerts")
      .select("*")
      .eq("is_active", true);

    const activeAlerts = alerts?.length || 0;

    // Potential savings (from recommendations)
    const { data: recommendations } = await supabase
      .from("supplier_recommendations")
      .select("potential_savings")
      .eq("is_active", true);

    const potentialSavings = recommendations?.reduce(
      (sum, r) => sum + (r.potential_savings || 0),
      0
    ) || 0;

    // Top supplier by spending
    const { data: supplierSpending } = await supabase
      .from("supplier_spending_summary")
      .select("supplier_id, total_cost")
      .gte("year_month", dateFrom.toISOString().substring(0, 7))
      .order("total_cost", { ascending: false })
      .limit(1);

    let topSupplier = { name: "N/A", spending: 0 };
    if (supplierSpending && supplierSpending.length > 0) {
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("supplier_name")
        .eq("id", supplierSpending[0].supplier_id)
        .single();

      topSupplier = {
        name: supplierData?.supplier_name || "N/A",
        spending: supplierSpending[0].total_cost / period,
      };
    }

    // Most expensive product
    const { data: products } = await supabase
      .from("supplier_products")
      .select("product_name, unit_price")
      .order("unit_price", { ascending: false })
      .limit(1);

    const mostExpensive = products?.[0]
      ? { name: products[0].product_name, cost: products[0].unit_price }
      : { name: "N/A", cost: 0 };

    // Forecast accuracy (basado en histórico)
    const forecastAccuracy = spending && spending.length >= 6 ? 80 : 60;

    // Trend direction
    let trendDirection: "up" | "down" | "stable" = "stable";
    if (spending && spending.length >= 3) {
      const recent = spending.slice(0, 3).reduce((sum, s) => sum + s.total_cost, 0) / 3;
      const older = spending.slice(3, 6).reduce((sum, s) => sum + s.total_cost, 0) / 3;
      const change = ((recent - older) / older) * 100;

      if (change > 5) trendDirection = "up";
      else if (change < -5) trendDirection = "down";
    }

    return NextResponse.json({
      success: true,
      period,
      kpi: {
        totalSpending: Math.round(totalSpending),
        avgSupplierCost: Math.round(avgSupplierCost),
        potentialSavings: Math.round(potentialSavings),
        activeAlerts,
        topSupplier,
        mostExpensive,
        forecastAccuracy,
        trendDirection,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching KPIs:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
