import { NextRequest, NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

// GET: listar usuarios
export async function GET(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const { data, error } = await supabase
      .from("app_users")
      .select("id, email, full_name, role, department, is_active, last_login")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// POST: crear usuario
export async function POST(request: NextRequest) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { email, full_name, role, department } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "email y role son requeridos" },
        { status: 400 },
      );
    }

    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin
      .createUser({
        email,
        password: Math.random().toString(36).slice(-12), // Password temporal
        email_confirm: false,
      });

    if (authError) throw authError;

    // Crear registro en app_users
    const { data: appUser, error: appError } = await supabase
      .from("app_users")
      .insert({
        auth_id: authData.user?.id,
        email,
        full_name,
        role,
        department,
      })
      .select()
      .single();

    if (appError) throw appError;

    return NextResponse.json({
      success: true,
      user: appUser,
      message: "Usuario creado. Revisa tu email para confirmar.",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
