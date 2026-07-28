/**
 * POST /api/auth/login/otp/request
 *
 * 请求 OTP：生成 6 位验证码并发送到电话号码。
 * 返回 OTP ID 和有效期。
 *
 * 请求体：
 * {
 *   "phone": "+34600123456"
 * }
 *
 * 响应成功 (200):
 * {
 *   "success": true,
 *   "otpId": "uuid",
 *   "expiresIn": 300   // 秒数
 * }
 *
 * 响应错误 (400/500):
 * {
 *   "success": false,
 *   "error": "错误信息"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth/otp-service";
import { buildOtpLoginResponse } from "@/lib/auth/otp-session";
import { logLoginEvent } from "@/lib/auth/supabase-auth";
import {
  isDeviceTrustedFor,
  phoneDeviceSubject,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "@/lib/auth/trusted-device";

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "电话号码为必填项",
        },
        { status: 400 }
      );
    }

    // 获取客户端 IP 和 User-Agent（用于审计日志）
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Dispositivo de confianza: este navegador ya verificó este número por SMS
    // hace menos de 30 días → entramos directamente, sin mandar otro código.
    const trusted = await isDeviceTrustedFor(
      request.cookies.get(TRUSTED_DEVICE_COOKIE_NAME)?.value,
      phoneDeviceSubject(phone),
    );
    if (trusted) {
      return buildOtpLoginResponse(request, phone, { trustedDevice: true });
    }

    // 请求 OTP
    const result = await requestOtp(phone);

    if (!result.success) {
      // 记录失败的尝试
      await logLoginEvent({
        status: "failed",
        loginMethod: "otp",
        ip,
        userAgent,
        failureReason: result.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // 成功：返回 OTP ID 和有效期
    return NextResponse.json(
      {
        success: true,
        otpId: result.otpId,
        expiresIn: result.expiresIn, // 秒数
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /auth/login/otp/request 异常:", error);

    return NextResponse.json(
      {
        success: false,
        error: "服务器错误，请稍后重试",
      },
      { status: 500 }
    );
  }
}
