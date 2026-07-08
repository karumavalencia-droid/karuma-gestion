import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// GET: obtener preferencias del usuario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id") || "admin";

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // Si no existe, crear preferencias por defecto
    if (!data) {
      const { data: newPrefs, error: createError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: userId,
          email_alerts: true,
          email_forecast: true,
          email_daily_digest: true,
          slack_enabled: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      return NextResponse.json({
        success: true,
        preferences: newPrefs,
      });
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// PATCH: actualizar preferencias del usuario
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...updates } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id requerido" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      preferences: data,
      message: "Preferencias actualizadas",
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
