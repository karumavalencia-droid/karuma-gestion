/**
 * Gastos (solo owner).
 *
 * GET  /api/gastos?mes=YYYY-MM  → lista de gastos del mes
 * POST /api/gastos              → alta de gasto
 *   { fecha, categoria, concepto, importe, empresa?, notas? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbGastoCategoria, DbGastoInsert } from "@/lib/supabase/types";

const CATEGORIAS: DbGastoCategoria[] = [
  "alquiler",
  "personal",
  "seguros_sociales",
  "proveedores",
  "suministros",
  "impuestos",
  "marketing",
  "comisiones",
  "otros",
];

function mesRange(mes: string): { desde: string; hasta: string } | null {
  const match = mes.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const desde = `${mes}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { desde, hasta: next };
}

export async function GET(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const mes = request.nextUrl.searchParams.get("mes");
  let query = supabase.from("gastos").select("*").order("fecha", { ascending: false });

  if (mes) {
    const range = mesRange(mes);
    if (!range) {
      return NextResponse.json({ error: "Parámetro mes inválido (YYYY-MM)" }, { status: 400 });
    }
    query = query.gte("fecha", range.desde).lt("fecha", range.hasta);
  }

  const { data, error } = await query.limit(500);
  if (error) {
    console.error("[gastos] Error listando:", error);
    return NextResponse.json({ error: "Error consultando gastos" }, { status: 500 });
  }

  return NextResponse.json({ gastos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  let body: Partial<DbGastoInsert>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const { fecha, categoria, concepto, importe } = body;
  const empresa = body.empresa ?? "kosushi";

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!categoria || !CATEGORIAS.includes(categoria)) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }
  if (!concepto?.trim()) {
    return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });
  }
  const importeNum = Number(importe);
  if (!Number.isFinite(importeNum) || importeNum < 0) {
    return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
  }
  if (empresa !== "kosushi" && empresa !== "spicy") {
    return NextResponse.json({ error: "Empresa inválida" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("gastos")
    .insert({
      fecha,
      categoria,
      concepto: concepto.trim(),
      importe: Math.round(importeNum * 100) / 100,
      empresa,
      fuente: "manual",
      notas: body.notas?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[gastos] Error creando:", error);
    return NextResponse.json({ error: "Error guardando el gasto" }, { status: 500 });
  }

  return NextResponse.json({ gasto: data }, { status: 201 });
}
