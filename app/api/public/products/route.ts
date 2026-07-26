import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return isHttpUrl(url) && key ? createClient(url, key) : null;
}

/**
 * GET /api/public/products
 * @description Obtener productos con filtros (API Pública)
 * @queryParam supplier_id - Filtrar por proveedor
 * @queryParam category - Filtrar por categoría
 * @queryParam page - Número de página
 * @queryParam limit - Registros por página
 * @returns Lista de productos
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    }
    const apiKey = request.headers.get("x-api-key") ||
      request.nextUrl.searchParams.get("api_key");

    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 },
      );
    }

    const supplierId = request.nextUrl.searchParams.get("supplier_id");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      100,
    );
    const offset = (page - 1) * limit;

    let query = supabase
      .from("supplier_products")
      .select("*, suppliers(supplier_name)", { count: "exact" });

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
