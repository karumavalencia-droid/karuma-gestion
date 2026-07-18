import crypto from "crypto";

/**
 * SMS 发送服务
 *
 * 支持提供商（通过 SMS_PROVIDER 环境变量选择）：
 *   - "aliyun_intl": 阿里云【国际站】国际短信（SendMessageWithTemplate, 2018-05-01）
 *                    适用于西班牙(+34)等海外号码。
 *   - 未设置 / "mock": 开发模式，只打印到日志（不真正发送）。
 *
 * 阿里云国际短信所需环境变量：
 *   SMS_PROVIDER=aliyun_intl
 *   ALIYUN_SMS_ACCESS_KEY_ID=...
 *   ALIYUN_SMS_ACCESS_KEY_SECRET=...
 *   ALIYUN_SMS_TEMPLATE_CODE=...        // 已审核通过的验证码模板 Code
 *   ALIYUN_SMS_FROM=...                 // 可选：SenderId / 发送方标识
 *   ALIYUN_SMS_REGION=ap-southeast-1    // 可选，默认新加坡区
 */

export interface SendSmsResult {
  success: boolean;
  provider: string;
  error?: string;
}

/**
 * 发送一条 OTP 验证码短信。
 * @param phone  E.164 格式号码，如 "+34625086359"
 * @param code   6 位验证码
 */
export async function sendOtpSms(
  phone: string,
  code: string
): Promise<SendSmsResult> {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  if (provider === "aliyun_intl") {
    return sendViaAliyunIntl(phone, code);
  }

  // 开发/默认：只记录日志，不真正发送。
  console.log(`[SMS:mock] 发送给 ${phone}: ${code}`);
  return { success: true, provider: "mock" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 阿里云国际短信
// ─────────────────────────────────────────────────────────────────────────────

/** RFC3986 百分号编码（阿里云 RPC 签名要求）。 */
function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function sendViaAliyunIntl(
  phone: string,
  code: string
): Promise<SendSmsResult> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const from = process.env.ALIYUN_SMS_FROM || "";
  const region = process.env.ALIYUN_SMS_REGION || "ap-southeast-1";

  if (!accessKeyId || !accessKeySecret || !templateCode) {
    console.error(
      "[SMS:aliyun_intl] 缺少配置：需要 ALIYUN_SMS_ACCESS_KEY_ID / _SECRET / _TEMPLATE_CODE"
    );
    return {
      success: false,
      provider: "aliyun_intl",
      error: "SMS no configurado en el servidor",
    };
  }

  // 国际短信的 To：国家码+号码，不带 "+" 或前导 "00"。
  // 例如 "+34625086359" -> "34625086359"
  const to = phone.replace(/^\+/, "").replace(/^00/, "");

  // RPC v1.0 公共参数 + 业务参数
  const params: Record<string, string> = {
    Action: "SendMessageWithTemplate",
    Version: "2018-05-01",
    Format: "JSON",
    RegionId: region,
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    To: to,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  };
  if (from) params.From = from;

  // 规范化查询串（按 key 升序，百分号编码）
  const canonicalized = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  // StringToSign = HTTPMethod & encode("/") & encode(canonicalizedQuery)
  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalized)}`;
  const signature = crypto
    .createHmac("sha1", `${accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");

  const endpoint = `https://dysmsapi.${region}.aliyuncs.com/`;
  const url = `${endpoint}?${canonicalized}&Signature=${percentEncode(signature)}`;

  try {
    const resp = await fetch(url, { method: "GET" });
    const data = (await resp.json()) as {
      Code?: string;
      Message?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
    };

    // 国际短信成功返回 ResponseCode === "OK"（部分接口用 Code === "OK"）。
    const ok = data.ResponseCode === "OK" || data.Code === "OK";
    if (!ok) {
      console.error("[SMS:aliyun_intl] 发送失败:", data);
      return {
        success: false,
        provider: "aliyun_intl",
        error: data.ResponseDescription || data.Message || "SMS send failed",
      };
    }

    return { success: true, provider: "aliyun_intl" };
  } catch (err) {
    console.error("[SMS:aliyun_intl] 请求异常:", err);
    return {
      success: false,
      provider: "aliyun_intl",
      error: "Error de red al enviar SMS",
    };
  }
}
