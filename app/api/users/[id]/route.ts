import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

// PATCH: actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const { id } = await params;
    const body = await request.json();
    const { full_name, role, department, is_active } = body;

    const { data, error } = await supabase
      .from("app_users")
      .update({
        full_name,
        role,
        department,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// DELETE: desactivar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const { id } = await params;

    const { error } = await supabase
      .from("app_users")
      .update({ is_active: false })
      .eq("id", parseInt(id));

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Usuario desactivado",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
