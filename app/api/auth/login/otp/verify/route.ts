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
import { buildOtpLoginResponse } from "@/lib/auth/otp-session";
import { logLoginEvent } from "@/lib/auth/supabase-auth";
import {
  addTrustedSubject,
  phoneDeviceSubject,
  TRUSTED_DEVICE_COOKIE_NAME,
  trustedDeviceCookieOptions,
} from "@/lib/auth/trusted-device";

export async function POST(request: NextRequest) {
  try {
    // Parsear request
    const body = await request.json();
    const { phone, code, trustDevice } = body;

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

    // Paso 3: Usuario existente → crear sesión. La lógica es la misma que usa
    // la entrada desde un dispositivo de confianza, así que vive compartida.
    const response = await buildOtpLoginResponse(request, phone);

    // Paso 4: "Recordar este dispositivo" → los próximos 30 días, sin SMS.
    if (trustDevice && response.status === 200) {
      const trustedToken = await addTrustedSubject(
        request.cookies.get(TRUSTED_DEVICE_COOKIE_NAME)?.value,
        phoneDeviceSubject(phone),
      );
      if (trustedToken) {
        response.cookies.set(
          TRUSTED_DEVICE_COOKIE_NAME,
          trustedToken,
          trustedDeviceCookieOptions(),
        );
      }
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
