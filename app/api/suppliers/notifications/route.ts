import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send-notification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// GET: obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id") || "admin";
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("is_read");

    let query = supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isRead !== null) {
      query = query.eq("is_read", isRead === "true");
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notifications: data,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// POST: crear y enviar notificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      supplier_id,
      notification_type,
      title,
      message,
      priority,
      data,
    } = body;

    if (!user_id || !notification_type || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: user_id, notification_type, title, message",
        },
        { status: 400 },
      );
    }

    // Enviar notificación
    const notification = await sendNotification({
      user_id,
      supplier_id,
      notification_type,
      title,
      message,
      priority,
      data,
    });

    return NextResponse.json({
      success: true,
      notification,
      message: "Notificación enviada correctamente",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
