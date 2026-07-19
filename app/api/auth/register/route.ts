/**
 * POST /api/auth/register
 *
 * Crear una cuenta de usuario (solo Owner).
 * Uso:
 * 1. Owner proporciona teléfono, nombre, rol
 * 2. Se crea auth user en Supabase + auth_accounts
 * 3. El nuevo usuario recibe OTP y completa su primer login
 *
 * Autorización: Solo Owner
 *
 * 请求体：
 * {
 *   "phone": "+34600123456",
 *   "displayName": "María García",
 *   "roleId": "manager"  // owner, manager, staff, kitchen, etc
 * }
 *
 * 响应成功 (201):
 * {
 *   "success": true,
 *   "accountId": "uuid",
 *   "authUserId": "uuid",
 *   "message": "Cuenta creada. El usuario puede hacer login con su número."
 * }
 *
 * 无权限 (403):
 * {
 *   "success": false,
 *   "error": "Solo el propietario puede crear cuentas"
 * }
 *
 * 错误 (400/500):
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { createAuthUser, logLoginEvent } from "@/lib/auth/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "No autenticado",
        },
        { status: 401 }
      );
    }

    // Verificar que sea Owner
    if (user.role !== "owner") {
      const ip =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      // Registrar intento no autorizado
      await logLoginEvent({
        status: "failed",
        loginMethod: "otp",
        ip,
        userAgent: request.headers.get("user-agent"),
        failureReason: "unauthorized_register_attempt",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Solo el propietario puede crear cuentas",
        },
        { status: 403 }
      );
    }

    // Parsear request
    const body = await request.json();
    const { phone, displayName, roleId = "staff" } = body;

    // Validar campos requeridos
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Número de teléfono requerido",
        },
        { status: 400 }
      );
    }

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Nombre requerido",
        },
        { status: 400 }
      );
    }

    // Validar rol (lista segura)
    const validRoles = [
      "owner",
      "manager",
      "staff",
      "kitchen",
      "sushi",
      "waiter",
      "cashier",
      "dishwasher",
    ];
    if (!validRoles.includes(roleId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Rol inválido. Debe ser uno de: ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Crear usuario
    const result = await createAuthUser({
      phone: phone.trim(),
      displayName: displayName.trim(),
      roleId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Registrar evento (creación de cuenta por Owner)
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    await logLoginEvent({
      status: "success",
      loginMethod: "otp", // Registramos como "otp" pero es creación
      ip,
      userAgent: request.headers.get("user-agent"),
      failureReason: `account_created_by_${user.name}`,
    });

    return NextResponse.json(
      {
        success: true,
        accountId: result.accountId,
        authUserId: result.authUserId,
        message:
          "Cuenta creada exitosamente. El usuario puede hacer login con su número de teléfono.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /auth/register 异常:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error del servidor al crear cuenta",
      },
      { status: 500 }
    );
  }
}
