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
 * GET /api/public/suppliers
 * @description Obtener lista de proveedores (API Pública)
 * @queryParam page - Número de página (default: 1)
 * @queryParam limit - Registros por página (default: 20, max: 100)
 * @queryParam api_key - API Key de autenticación
 * @returns Listado de proveedores con paginación
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    }
    const apiKey = request.headers.get("x-api-key") ||
      request.nextUrl.searchParams.get("api_key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key requerida" },
        { status: 401 },
      );
    }

    // Validar API key (en producción, verificar contra tabla de API keys)
    if (apiKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json(
        { error: "API key inválida" },
        { status: 401 },
      );
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20"),
      100,
    );
    const offset = (page - 1) * limit;

    const { data: suppliers, error, count } = await supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/public/suppliers
 * @description Crear nuevo proveedor (API Pública)
 * @body { supplier_name, contact_name, contact_email, contact_phone }
 * @returns Proveedor creado
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    }
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { supplier_name, contact_name, contact_email, contact_phone } = body;

    if (!supplier_name) {
      return NextResponse.json(
        { error: "supplier_name requerido" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        supplier_name,
        contact_name,
        contact_email,
        contact_phone,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
