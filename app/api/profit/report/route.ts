import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { isAdminSession } from "@/lib/auth/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getDefaultLocationId } from "@/lib/sales-sync/config";
import { buildProfitReport, monthRange, type ProfitDocument } from "@/lib/profit/report";
import type { DbGasto, DbSalesDaily } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;
  if (!isAdminSession(guard.user)) return NextResponse.json({ error: "Solo la sesión de administración puede acceder al informe" }, { status: 403 });
  const month = request.nextUrl.searchParams.get("mes") ?? "";
  const range = monthRange(month);
  if (!range) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });

  try {
    // Page every ledger query: never silently truncate financial totals at the API row limit.
    const sales: DbSalesDaily[] = [];
    const expenses: DbGasto[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("sales_daily").select("*")
        .eq("location_id", getDefaultLocationId()).gte("business_date", range.start).lt("business_date", range.end)
        .order("business_date").order("id").range(offset, offset + 499);
      if (error) throw error;
      sales.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("gastos").select("*").eq("empresa", "kosushi")
        .gte("fecha", range.start).lt("fecha", range.end).order("fecha").order("id").range(offset, offset + 499);
      if (error) throw error;
      expenses.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
    const documents: ProfitDocument[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("documentos").select("id,nombre,categoria,document_type,fecha_documento,periodo,total,subtotal,metadata")
        .or("categoria.in.(facturas,nominas,impuestos),document_type.eq.invoice")
        .order("id").range(offset, offset + 499);
      if (error) throw error;
      documents.push(...((data ?? []) as ProfitDocument[]));
      if ((data?.length ?? 0) < 500) break;
    }
    const report = buildProfitReport(month, sales, expenses, documents);
    return NextResponse.json({ ...report, documentsToReview: documents.filter(doc => JSON.stringify(doc).includes(month)).length,
      generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[profit/report]", error);
    return NextResponse.json({ error: "No se pudo consultar el informe. Inténtalo de nuevo." }, { status: 500 });
  }
}
