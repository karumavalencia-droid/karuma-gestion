import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { buildOperatingAnalytics, resolveAnalyticsRange } from "@/lib/analytics/operating";
import { isDocumentoOwner } from "@/lib/documentos/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const range = resolveAnalyticsRange(request.nextUrl.searchParams.get("startDate"), request.nextUrl.searchParams.get("endDate"));
  try {
    const analytics = await buildOperatingAnalytics(range);
    return NextResponse.json(analytics, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[analytics] operating metrics failed", error);
    return NextResponse.json({ error: "No se pudieron calcular las métricas operativas" }, { status: 500 });
  }
}
