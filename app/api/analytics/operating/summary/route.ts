import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { buildOperatingAnalytics, describeOperatingEvidence, resolveAnalyticsRange } from "@/lib/analytics/operating";
import { isDocumentoOwner } from "@/lib/documentos/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let body: { startDate?: unknown; endDate?: unknown } = {};
  try {
    body = await request.json() as { startDate?: unknown; endDate?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const range = resolveAnalyticsRange(typeof body.startDate === "string" ? body.startDate : null, typeof body.endDate === "string" ? body.endDate : null);

  try {
    const analytics = await buildOperatingAnalytics(range);
    const deterministicSummary = describeOperatingEvidence(analytics);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ summary: deterministicSummary, generatedBy: "rules", sources: analytics.sources, dataCompleteness: analytics.dataCompleteness });
    }

    const evidence = {
      range: analytics.range,
      metrics: analytics.metrics,
      metricStatus: analytics.metricStatus,
      anomalies: analytics.anomalies,
      purchaseAnalysis: {
        status: analytics.purchaseAnalysis.status,
        suppliers: analytics.purchaseAnalysis.suppliers.slice(0, 5),
        products: analytics.purchaseAnalysis.products.slice(0, 8),
      },
      sources: analytics.sources.map(({ key, label, status, records, note }) => ({ key, label, status, records, note })),
      dataCompleteness: analytics.dataCompleteness,
    };
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_ANALYTICS_MODEL || process.env.OPENAI_DOCUMENT_CHAT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "Eres el analista operativo de Karuma. Escribe en español un resumen breve y útil, con 3-5 frases o viñetas. Usa solamente la evidencia JSON proporcionada. No calcules cifras nuevas, no inventes causas, proveedores, comisiones, costes ni recomendaciones. Indica explícitamente si un dato está incompleto, no confirmado, parcial o ausente. Cada conclusión importante debe nombrar su fuente o el tipo de evidencia (ventas diarias, facturas confirmadas, líneas de factura).",
      input: `Resumen determinista ya calculado por el programa:\n${deterministicSummary}\n\nEvidencia estructurada:\n${JSON.stringify(evidence)}`,
      max_output_tokens: 800,
    });
    const summary = response.output_text.trim() || deterministicSummary;
    return NextResponse.json({ summary, generatedBy: "ai", sources: analytics.sources, dataCompleteness: analytics.dataCompleteness });
  } catch (error) {
    console.error("[analytics] operating summary failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo generar el resumen operativo" }, { status: 502 });
  }
}
