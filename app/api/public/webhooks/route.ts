import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

interface Webhook {
  id: string;
  event: string;
  url: string;
  api_key: string;
  active: boolean;
  created_at: string;
}

/**
 * GET /api/public/webhooks
 * @description Listar webhooks configurados
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      webhooks: data,
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/public/webhooks
 * @description Registrar nuevo webhook
 * @body { event, url, active }
 * @events supplier.created, supplier.updated, product.created, product.updated,
 *         alert.triggered, order.approved
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { event, url, active = true } = body;

    if (!event || !url) {
      return NextResponse.json(
        { error: "event y url requeridos" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        event,
        url,
        api_key: apiKey,
        active,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      webhook: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
