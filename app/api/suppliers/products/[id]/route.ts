import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const { quantity, unit, product_name } = body;
    const { id: rawId } = await params;
    const id = parseInt(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_products")
      .update({
        ...(quantity !== undefined && { quantity }),
        ...(unit && { unit }),
        ...(product_name && { product_name }),
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: data?.[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("supplier_products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Producto eliminado",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
