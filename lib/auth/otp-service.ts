import { escapeHtml, sendTransactionalEmail } from "../email/send";
import { getSupabaseAdmin } from "../supabase/admin";
import type { DbAuthOtpSessionInsert } from "../supabase/types";
import { sendOtpSms } from "./sms";

/**
 * OTP 服务：生成、存储、验证一次性密码。
 * 支持 6 位数字代码，5 分钟有效期，3 次尝试上限。
 */

function getOtpSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
}

export interface OtpRequestResult {
  success: boolean;
  otpId?: string;
  expiresIn?: number; // 秒数
  error?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  accountId?: string;
  isNewUser?: boolean;
  error?: string;
}

/**
 * 生成 6 位数字 OTP
 */
function generateOtpCode(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

/**
 * 请求 OTP：生成代码并存储到数据库
 * @param phone 电话号码（格式：+34600123456）
 * @returns OTP ID 和过期时间
 */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  try {
    const supabase = getOtpSupabase();
    // 规范化电话号码
    const normalizedPhone = phone.trim();
    if (!normalizedPhone.match(/^\+\d{10,15}$/)) {
      return {
        success: false,
        error: "电话号码格式无效（使用 +34600123456 格式）",
      };
    }

    // 生成 6 位代码
    const code = generateOtpCode();

    // 计算过期时间（5 分钟后）
    const validityMinutes =
      parseInt(process.env.OTP_VALIDITY_MINUTES || "5", 10) || 5;
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    // 存储 OTP 到数据库
    const { data, error } = await supabase
      .from("auth_otp_sessions")
      .insert({
        phone: normalizedPhone,
        code,
        attempts: 0,
        max_attempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "3", 10) || 3,
        expires_at: expiresAt.toISOString(),
        verified_at: null,
        account_id: null,
      } as DbAuthOtpSessionInsert)
      .select("id")
      .single();

    if (error) {
      console.error("[OTP] 存储失败:", error);
      return {
        success: false,
        error: "无法存储 OTP，请稍后重试",
      };
    }

    // 发送 SMS（提供商由 SMS_PROVIDER 决定；未配置时为 mock，只打印日志）
    const smsResult = await sendOtpSms(normalizedPhone, code);
    if (!smsResult.success) {
      // 短信没发出去：删掉刚存的 OTP，避免留下发不出去的码
      if (data?.id) {
        await supabase.from("auth_otp_sessions").delete().eq("id", data.id);
      }
      return {
        success: false,
        error: smsResult.error || "无法发送验证码，请稍后重试",
      };
    }

    return {
      success: true,
      otpId: data?.id,
      expiresIn: validityMinutes * 60,
    };
  } catch (err) {
    console.error("[OTP] 请求异常:", err);
    return {
      success: false,
      error: "服务器错误，请稍后重试",
    };
  }
}

/**
 * 验证 OTP：检查代码是否正确，创建或更新用户账户
 * @param phone 电话号码
 * @param code OTP 代码
 * @returns 账户 ID 和是否是新用户
 */
export async function verifyOtp(
  phone: string,
  code: string
): Promise<OtpVerifyResult> {
  try {
    const supabase = getOtpSupabase();
    const normalizedPhone = phone.trim();

    // 查找最新的、未验证的 OTP 记录
    const { data: otpSession, error: fetchError } = await supabase
      .from("auth_otp_sessions")
      .select("*")
      .eq("phone", normalizedPhone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpSession) {
      return {
        success: false,
        error: "未找到 OTP 请求或已过期",
      };
    }

    // 检查是否过期
    if (new Date(otpSession.expires_at) < new Date()) {
      return {
        success: false,
        error: "OTP 已过期，请重新请求",
      };
    }

    // 检查尝试次数
    if (otpSession.attempts >= otpSession.max_attempts) {
      return {
        success: false,
        error: "尝试次数过多，请稍后重新请求",
      };
    }

    // 验证代码
    if (otpSession.code !== code.trim()) {
      // 增加尝试次数
      await supabase
        .from("auth_otp_sessions")
        .update({ attempts: otpSession.attempts + 1 })
        .eq("id", otpSession.id);

      return {
        success: false,
        error: "OTP 代码不正确",
      };
    }

    // 代码正确，标记为已验证
    await supabase
      .from("auth_otp_sessions")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpSession.id);

    // 查找或创建账户
    let accountId = otpSession.account_id;
    let isNewUser = false;

    if (!accountId) {
      // 检查是否已存在账户（比如之前用这个电话号码登录过）
      const { data: existingAccount } = await supabase
        .from("auth_accounts")
        .select("id")
        .eq("phone", normalizedPhone)
        .single();

      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        // 新用户，但还没有 Supabase auth.users 记录
        // 在实际登录 API 中会创建
        isNewUser = true;
      }
    }

    return {
      success: true,
      accountId: accountId ?? undefined,
      isNewUser,
    };
  } catch (err) {
    console.error("[OTP] 验证异常:", err);
    return {
      success: false,
      error: "验证过程出错，请稍后重试",
    };
  }
}

/**
 * 清理过期的 OTP 记录（定期执行）
 */
export async function cleanupExpiredOtps(): Promise<void> {
  try {
    const supabase = getOtpSupabase();
    const { error } = await supabase
      .from("auth_otp_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .is("verified_at", null);

    if (error) {
      console.error("[OTP] 清理失败:", error);
    } else {
      console.log("[OTP] 清理过期记录完成");
    }
  } catch (err) {
    console.error("[OTP] 清理异常:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP por correo (portal del empleado)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La columna `auth_otp_sessions.phone` guarda el DESTINO del código. Para el
 * portal del empleado guardamos ahí su dirección de correo, y así no hace
 * falta tocar el esquema de la base de datos. No hay colisión posible: un
 * teléfono siempre empieza por "+" y un correo siempre lleva "@".
 *
 * verifyOtp() sirve igual para los dos: solo compara contra ese destino.
 */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildOtpEmail(code: string, validityMinutes: number) {
  const subject = `Tu código de acceso a Karuma: ${code}`;
  const text = [
    "Hola,",
    "",
    `Tu código para entrar en el portal de Karuma es: ${code}`,
    "",
    `Caduca en ${validityMinutes} minutos y solo se puede usar una vez.`,
    "Si no has intentado entrar, no hagas nada y avisa al encargado.",
    "",
    "Karuma Sushi & Grill",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 4px">Karuma Sushi &amp; Grill</h1>
      <p style="margin:0 0 20px;color:#4b5563">Código de acceso al portal</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;background:#f9fafb;border-radius:12px;padding:18px 0;margin:0 0 20px">${escapeHtml(code)}</p>
      <p style="margin:0 0 8px">Caduca en ${validityMinutes} minutos y solo se puede usar una vez.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">Si no has intentado entrar, no hagas nada y avisa al encargado.</p>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Pide un OTP y lo manda por correo. Gemelo de requestOtp(), con el mismo
 * almacenamiento, la misma caducidad y el mismo límite de intentos; solo
 * cambia el canal de entrega.
 */
export async function requestEmailOtp(email: string): Promise<OtpRequestResult> {
  try {
    const supabase = getOtpSupabase();
    const destino = email.trim().toLowerCase();
    if (!isValidEmail(destino)) {
      return { success: false, error: "Dirección de correo no válida" };
    }

    const code = generateOtpCode();
    const validityMinutes =
      parseInt(process.env.OTP_VALIDITY_MINUTES || "5", 10) || 5;
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from("auth_otp_sessions")
      .insert({
        phone: destino,
        code,
        attempts: 0,
        max_attempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "3", 10) || 3,
        expires_at: expiresAt.toISOString(),
        verified_at: null,
        account_id: null,
      } as DbAuthOtpSessionInsert)
      .select("id")
      .single();

    if (error) {
      console.error("[OTP:email] no se pudo guardar:", error);
      return { success: false, error: "No se pudo generar el código, inténtalo de nuevo" };
    }

    const { subject, text, html } = buildOtpEmail(code, validityMinutes);
    const sent = await sendTransactionalEmail({
      to: destino,
      subject,
      text,
      html,
      // El id de la fila es único por petición: dos códigos seguidos no se
      // deduplican en Resend y el empleado recibe siempre el último.
      idempotencyKey: `portal-otp-${data?.id ?? Date.now()}`,
    });

    if (!sent.sent) {
      // El correo no salió: se borra el OTP para no dejar un código huérfano.
      if (data?.id) {
        await supabase.from("auth_otp_sessions").delete().eq("id", data.id);
      }
      console.error("[OTP:email] no se pudo enviar:", sent.reason, sent.error ?? "");
      return {
        success: false,
        error:
          sent.reason === "missing_config"
            ? "El envío de correo no está configurado en el servidor"
            : "No se pudo enviar el código por correo, inténtalo de nuevo",
      };
    }

    return { success: true, otpId: data?.id, expiresIn: validityMinutes * 60 };
  } catch (err) {
    console.error("[OTP:email] excepción:", err);
    return { success: false, error: "Error del servidor, inténtalo de nuevo" };
  }
}
