import { NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

export async function GET(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");
    const months = parseInt(url.searchParams.get("months") || "3");

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplier_id requerido" },
        { status: 400 },
      );
    }

    // Obtener datos históricos
    const { data: history } = await supabase
      .from("supplier_spending_summary")
      .select("*")
      .eq("supplier_id", parseInt(supplierId))
      .order("year_month", { ascending: false })
      .limit(12);

    if (!history || history.length === 0) {
      return NextResponse.json({
        success: true,
        forecast: [],
        message: "No hay datos históricos para hacer pronóstico",
      });
    }

    // Cálculos simples: promedio móvil + tendencia
    const quantities = history.map((h) => h.total_quantity || 0).reverse();
    const costs = history.map((h) => h.total_cost || 0).reverse();

    // Promedio de los últimos 3 meses
    const avgQuantity = quantities.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const avgCost = costs.slice(-3).reduce((a, b) => a + b, 0) / 3;

    // Tendencia (simple: último vs promedio histórico)
    const historicalAvgQuantity = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const historicalAvgCost = costs.reduce((a, b) => a + b, 0) / costs.length;

    const quantityTrend = avgQuantity / historicalAvgQuantity;
    const costTrend = avgCost / historicalAvgCost;

    // Generar pronóstico
    const now = new Date();
    const forecast = [];

    for (let i = 1; i <= months; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + i);
      const yearMonth = futureDate.toISOString().substring(0, 7);

      // Aplicar tendencia
      const forecastQuantity = Math.round(avgQuantity * quantityTrend * 100) / 100;
      const forecastCost = Math.round(avgCost * costTrend * 100) / 100;
      const costPerUnit = forecastQuantity > 0 ? forecastCost / forecastQuantity : 0;

      forecast.push({
        year_month: yearMonth,
        forecast_quantity: forecastQuantity,
        forecast_cost: forecastCost,
        cost_per_unit: Math.round(costPerUnit * 100) / 100,
        confidence: 0.75, // 75% confianza (datos limitados)
      });
    }

    return NextResponse.json({
      success: true,
      supplier_id: parseInt(supplierId),
      historical_months: history.length,
      metrics: {
        avg_monthly_quantity: Math.round(avgQuantity * 100) / 100,
        avg_monthly_cost: Math.round(avgCost * 100) / 100,
        quantity_trend: Math.round(quantityTrend * 100) / 100,
        cost_trend: Math.round(costTrend * 100) / 100,
      },
      forecast,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
