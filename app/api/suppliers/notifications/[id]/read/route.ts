import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

// PATCH: marcar notificación como leída
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const { id } = await params;
    const { is_read } = await request.json();

    const { data, error } = await supabase
      .from("user_notifications")
      .update({
        is_read,
        read_at: is_read ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
