/**
 * POST /api/auth/login/otp/verify
 *
 * 验证 OTP 代码：
 * - 如果有效 + 账户存在 → 登录成功，创建会话，设置 cookie
 * - 如果有效 + 新用户 → 返回令牌提示，客户端需要进行注册（阶段 3）
 * - 如果无效 → 登录失败
 *
 * 请求体：
 * {
 *   "phone": "+34600123456",
 *   "code": "123456"
 * }
 *
 * 响应成功 (200):
 * {
 *   "success": true,
 *   "isNewUser": false,
 *   "user": {
 *     "displayName": "María García",
 *     "role": "manager"
 *   }
 * }
 *
 * 新用户 (200):
 * {
 *   "success": true,
 *   "isNewUser": true,
 *   "message": "Número verificado. Por favor, complete su perfil."
 * }
 *
 * 错误 (400/500):
 * {
 *   "success": false,
 *   "error": "OTP inválido"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp-service";
import {
  createAuthUser,
  getAccountByPhone,
  updateLastLogin,
  logLoginEvent,
  getOrCreateSession,
} from "@/lib/auth/supabase-auth";
import { createSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    // Parsear request
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          error: "Número y código son requeridos",
        },
        { status: 400 }
      );
    }

    // Obtener IP y User-Agent para auditoría
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Paso 1: Verificar OTP
    const otpResult = await verifyOtp(phone, code);

    if (!otpResult.success) {
      // Registrar intento fallido
      await logLoginEvent({
        status: "failed",
        loginMethod: "otp",
        ip,
        userAgent,
        failureReason: otpResult.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: otpResult.error,
        },
        { status: 400 }
      );
    }

    // Paso 2: Verificar si es usuario nuevo
    if (otpResult.isNewUser) {
      // Nuevo usuario: el flujo continuará en /api/auth/register
      return NextResponse.json(
        {
          success: true,
          isNewUser: true,
          phone: phone, // Para que el cliente sepa qué número registrar
          message: "Número verificado. Por favor, complete su perfil.",
        },
        { status: 200 }
      );
    }

    // Paso 3: Usuario existente → obtener cuenta
    const account = await getAccountByPhone(phone);

    if (!account) {
      // Esto no debería pasar (verificamos arriba)
      await logLoginEvent({
        status: "failed",
        loginMethod: "otp",
        ip,
        userAgent,
        failureReason: "Cuenta no encontrada",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Error al encontrar la cuenta",
        },
        { status: 500 }
      );
    }

    // Verificar que la cuenta no esté deshabilitada
    if (account.status !== "active") {
      await logLoginEvent({
        accountId: account.id,
        status: "failed",
        loginMethod: "otp",
        ip,
        userAgent,
        failureReason: `account_${account.status}`,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Tu cuenta está deshabilitada. Contacta al administrador.",
        },
        { status: 403 }
      );
    }

    // Paso 4: Crear sesión de dispositivo
    const deviceId = request.cookies.get("device-id")?.value || `device_${Date.now()}`;
    await getOrCreateSession({
      accountId: account.id,
      deviceId,
      ip,
      deviceName: request.headers.get("user-agent") ?? undefined,
    });

    // Paso 5: Actualizar auditoría (último login)
    await updateLastLogin(account.id, ip);

    // Paso 6: Crear token de sesión
    const sessionToken = await createSessionToken({
      name: account.display_name,
      email: account.auth_user_id, // Usar auth_user_id como email provisional
      role: (account.role_id as any) || "staff", // Cast según tipos actuales
      employeeId: null, // Por ahora, solo cuentas de usuario, no de empleado
    });

    // Paso 7: Registrar login exitoso
    await logLoginEvent({
      accountId: account.id,
      status: "success",
      loginMethod: "otp",
      ip,
      userAgent,
    });

    // Paso 8: Crear response con cookie de sesión
    const response = NextResponse.json(
      {
        success: true,
        isNewUser: false,
        user: {
          displayName: account.display_name,
          role: account.role_id,
        },
      },
      { status: 200 }
    );

    // Configurar cookie de sesión (segura, HttpOnly, SameSite)
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Opcional: guardar device-id si aún no existe
    if (!request.cookies.get("device-id")) {
      response.cookies.set({
        name: "device-id",
        value: deviceId,
        maxAge: 365 * 24 * 60 * 60, // 1 año
        httpOnly: false, // Accesible desde JS para device fingerprinting
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[API] POST /auth/login/otp/verify 异常:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error del servidor al verificar OTP",
      },
      { status: 500 }
    );
  }
}
