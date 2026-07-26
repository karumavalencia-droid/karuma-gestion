import { NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

export async function GET() {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const { data, error } = await supabase
      .from("suppliers")
      .select(
        `
        *,
        supplier_products(count)
      `,
      )
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      suppliers: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { id, name, contact_email, phone, website, notes } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID y nombre requeridos" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        id,
        name,
        contact_email,
        phone,
        website,
        notes,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      supplier: data?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
