import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get("type") || "summary"; // summary, analytics, recommendations
    const supplierId = searchParams.get("supplier_id");
    const period = searchParams.get("period") || "6";

    // Obtener datos según tipo de reporte
    let reportData: any = {};

    if (reportType === "summary") {
      // Reporte ejecutivo
      reportData = await generateSummaryReport(period);
    } else if (reportType === "analytics" && supplierId) {
      // Reporte de analytics de proveedor
      reportData = await generateAnalyticsReport(supplierId, period);
    } else if (reportType === "recommendations") {
      // Reporte de recomendaciones
      reportData = await generateRecommendationsReport();
    }

    // Generar HTML para convertir a PDF
    const html = generateHTML(reportData, reportType);

    // En producción, usar una librería como puppeteer o usar un servicio externo
    // Por ahora, retornar JSON con advertencia
    return NextResponse.json({
      success: true,
      reportType,
      message: "PDF export requiere servicio externo (Puppeteer o similiar)",
      html: html.substring(0, 500) + "...",
      data: reportData,
      note: "Implementar con npm install puppeteer o usar API externa",
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

async function generateSummaryReport(period: string) {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - parseInt(period));

  const { data: spending } = await supabase
    .from("supplier_spending_summary")
    .select("*")
    .gte("year_month", dateFrom.toISOString().substring(0, 7));

  const { data: alerts } = await supabase
    .from("supplier_product_alerts")
    .select("*")
    .eq("is_active", true);

  const { data: recommendations } = await supabase
    .from("supplier_recommendations")
    .select("*")
    .eq("is_active", true);

  return {
    title: "Reporte Ejecutivo de Proveedores",
    date: new Date().toLocaleDateString("es-ES"),
    period,
    totalSpending: spending?.reduce((sum, s) => sum + s.total_cost, 0) || 0,
    transactionCount: spending?.length || 0,
    activeAlerts: alerts?.length || 0,
    potentialSavings: recommendations?.reduce((sum, r) => sum + (r.potential_savings || 0), 0) || 0,
    spending: spending || [],
    alerts: alerts || [],
    recommendations: recommendations || [],
  };
}

async function generateAnalyticsReport(supplierId: string, period: string) {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - parseInt(period));

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", parseInt(supplierId))
    .single();

  const { data: products } = await supabase
    .from("supplier_products")
    .select("*")
    .eq("supplier_id", parseInt(supplierId));

  const { data: spending } = await supabase
    .from("supplier_spending_summary")
    .select("*")
    .eq("supplier_id", parseInt(supplierId))
    .gte("year_month", dateFrom.toISOString().substring(0, 7));

  return {
    title: `Reporte Analytics - ${supplier?.supplier_name}`,
    date: new Date().toLocaleDateString("es-ES"),
    supplier,
    products: products || [],
    spending: spending || [],
    totalCost: spending?.reduce((sum, s) => sum + s.total_cost, 0) || 0,
    productCount: products?.length || 0,
  };
}

async function generateRecommendationsReport() {
  const { data: recommendations } = await supabase
    .from("supplier_recommendations")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  const totalSavings = recommendations?.reduce(
    (sum, r) => sum + (r.potential_savings || 0),
    0
  ) || 0;

  return {
    title: "Reporte de Recomendaciones Inteligentes",
    date: new Date().toLocaleDateString("es-ES"),
    recommendations: recommendations || [],
    totalRecommendations: recommendations?.length || 0,
    totalPotentialSavings: totalSavings,
    avgConfidence: recommendations && recommendations.length > 0
      ? (recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length).toFixed(2)
      : 0,
  };
}

function generateHTML(reportData: any, reportType: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${reportData.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .date { color: #7f8c8d; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #3498db; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ecf0f1; }
        .kpi { display: flex; gap: 20px; margin: 20px 0; }
        .kpi-box { flex: 1; border: 2px solid #ecf0f1; padding: 15px; border-radius: 5px; }
        .kpi-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .kpi-label { font-size: 12px; color: #7f8c8d; }
        .logo { font-size: 28px; font-weight: bold; color: #c41e3a; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="logo">🍱 Karuma ERP</div>
      <h1>${reportData.title}</h1>
      <p class="date">Generado: ${reportData.date}</p>

      ${reportType === "summary" ? `
        <div class="kpi">
          <div class="kpi-box">
            <div class="kpi-label">GASTO TOTAL</div>
            <div class="kpi-value">€${reportData.totalSpending?.toLocaleString("es-ES") || 0}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">TRANSACCIONES</div>
            <div class="kpi-value">${reportData.transactionCount}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">ALERTAS ACTIVAS</div>
            <div class="kpi-value">${reportData.activeAlerts}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">AHORROS POTENCIALES</div>
            <div class="kpi-value">€${reportData.potentialSavings?.toLocaleString("es-ES") || 0}</div>
          </div>
        </div>
        <h2>Gastos por Período</h2>
        <table>
          <tr>
            <th>Período</th>
            <th>Cantidad</th>
            <th>Costo Total</th>
            <th>Costo Promedio/Unidad</th>
          </tr>
          ${reportData.spending.map((s: any) => `
            <tr>
              <td>${s.year_month}</td>
              <td>${s.total_quantity}</td>
              <td>€${s.total_cost.toLocaleString("es-ES")}</td>
              <td>€${s.avg_unit_cost.toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>
      ` : ""}

      ${reportType === "analytics" ? `
        <h2>Proveedor: ${reportData.supplier?.supplier_name}</h2>
        <p>Total costo: <strong>€${reportData.totalCost?.toLocaleString("es-ES") || 0}</strong></p>
        <p>Productos: <strong>${reportData.productCount}</strong></p>
      ` : ""}

      ${reportType === "recommendations" ? `
        <div class="kpi">
          <div class="kpi-box">
            <div class="kpi-label">RECOMENDACIONES</div>
            <div class="kpi-value">${reportData.totalRecommendations}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">AHORROS POTENCIALES</div>
            <div class="kpi-value">€${reportData.totalPotentialSavings?.toLocaleString("es-ES") || 0}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">CONFIANZA PROMEDIO</div>
            <div class="kpi-value">${reportData.avgConfidence}%</div>
          </div>
        </div>
      ` : ""}

      <p style="margin-top: 40px; border-top: 1px solid #ecf0f1; padding-top: 20px; font-size: 12px; color: #7f8c8d;">
        Reporte generado automáticamente por Karuma ERP • ${new Date().toLocaleString("es-ES")}
      </p>
    </body>
    </html>
  `;
}
