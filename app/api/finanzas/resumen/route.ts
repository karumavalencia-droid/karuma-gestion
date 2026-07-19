/**
 * GET /api/finanzas/resumen?mes=YYYY-MM (solo owner)
 *
 * Resumen financiero real del mes:
 *  - ingresos: suma de sales_daily.net_sales del mes
 *  - gastos: total y desglose por categoría desde la tabla gastos
 *  - beneficio: ingresos - gastos
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const mes = request.nextUrl.searchParams.get("mes") ?? "";
  const match = mes.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return NextResponse.json({ error: "Parámetro mes requerido (YYYY-MM)" }, { status: 400 });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const desde = `${mes}-01`;
  const hasta =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [ventasRes, gastosRes] = await Promise.all([
    supabase
      .from("sales_daily")
      .select("net_sales, business_date")
      .gte("business_date", desde)
      .lt("business_date", hasta),
    supabase
      .from("gastos")
      .select("categoria, importe")
      .gte("fecha", desde)
      .lt("fecha", hasta),
  ]);

  if (ventasRes.error || gastosRes.error) {
    console.error("[finanzas] Error resumen:", ventasRes.error ?? gastosRes.error);
    return NextResponse.json({ error: "Error consultando datos" }, { status: 500 });
  }

  const ingresos = (ventasRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.net_sales ?? 0),
    0,
  );
  const diasConVentas = (ventasRes.data ?? []).filter(
    (row) => Number(row.net_sales ?? 0) > 0,
  ).length;

  const porCategoria: Record<string, number> = {};
  let gastosTotal = 0;
  for (const gasto of gastosRes.data ?? []) {
    const importe = Number(gasto.importe ?? 0);
    gastosTotal += importe;
    porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] ?? 0) + importe;
  }

  return NextResponse.json({
    mes,
    ingresos: Math.round(ingresos * 100) / 100,
    diasConVentas,
    gastos: Math.round(gastosTotal * 100) / 100,
    beneficio: Math.round((ingresos - gastosTotal) * 100) / 100,
    gastosPorCategoria: porCategoria,
  });
}
