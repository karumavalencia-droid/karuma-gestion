/**
 * POST /api/auth/logout
 *
 * Cerrar sesión:
 * - Eliminar cookie de sesión
 * - Revocar sesión de dispositivo en la BD
 * - Registrar logout en audit log
 *
 * Respuesta (200):
 * {
 *   "success": true,
 *   "message": "Sesión cerrada"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Obtener usuario actual
    const user = await getSessionUser(request);

    // Incluso si no hay sesión, respondemos OK (idempotente)
    if (user) {
      // Obtener device-id para revocar sesión específica
      const deviceId = request.cookies.get("device-id")?.value || "unknown";

      // Revocar sesión en la BD
      const { error: revokeError } = await supabase
        .from("auth_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("device_id", deviceId);

      if (revokeError) {
        console.error("[Logout] Error revocando sesión:", revokeError);
      }
    }

    // Crear response
    const response = NextResponse.json(
      {
        success: true,
        message: "Sesión cerrada",
      },
      { status: 200 }
    );

    // Limpiar cookies
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete("device-id");

    return response;
  } catch (error) {
    console.error("[API] POST /auth/logout 异常:", error);

    // Incluso en caso de error, limpiar cookie
    const response = NextResponse.json(
      {
        success: false,
        error: "Error al cerrar sesión",
      },
      { status: 500 }
    );

    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
