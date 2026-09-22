import bcrypt from "bcryptjs";
import { escapeHtml, maskEmail, sendTransactionalEmail } from "@/lib/email/send";
import { normalizeStaffEmail } from "@/lib/staff/correo";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "./session";

const CODE_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const RESEND_WAIT_SECONDS = 60;

export type VerificationPurpose = "activation" | "password_reset";

export function validateEmployeePassword(password: string): string | null {
  const bytes = new TextEncoder().encode(password).byteLength;
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (bytes > 72) return "La contraseña es demasiado larga.";
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  return null;
}

function generateCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

function buildVerificationEmail(code: string, purpose: VerificationPurpose) {
  const action = purpose === "activation" ? "activar tu cuenta" : "cambiar tu contraseña";
  const subject = `Código de seguridad de Karuma: ${code}`;
  const text = [
    "Hola,",
    "",
    `Tu código para ${action} es: ${code}`,
    "",
    `Caduca en ${CODE_MINUTES} minutos y solo se puede usar una vez.`,
    "Si no has solicitado este cambio, avisa al encargado.",
    "",
    "Karuma Sushi & Grill",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 4px">Karuma Sushi &amp; Grill</h1>
      <p style="margin:0 0 20px;color:#4b5563">Código para ${escapeHtml(action)}</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;background:#f9fafb;border-radius:12px;padding:18px 0;margin:0 0 20px">${escapeHtml(code)}</p>
      <p style="margin:0 0 8px">Caduca en ${CODE_MINUTES} minutos y solo se puede usar una vez.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">Si no has solicitado este cambio, avisa al encargado.</p>
    </div>`;
  return { subject, text, html };
}

async function createAndSendVerification(input: {
  employeeKey: string;
  email: string;
  purpose: VerificationPurpose;
}) {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false as const, error: "Base de datos no configurada" };

  const since = new Date(Date.now() - RESEND_WAIT_SECONDS * 1000).toISOString();
  const { data: recent } = await db
    .from("employee_account_verifications")
    .select("id")
    .eq("employee_key", input.employeeKey)
    .eq("purpose", input.purpose)
    .is("used_at", null)
    .gte("created_at", since)
    .limit(1);
  if (recent?.length) {
    return { ok: false as const, error: "Espera un minuto antes de pedir otro código." };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("employee_account_verifications")
    .insert({
      employee_key: input.employeeKey,
      email: input.email,
      purpose: input.purpose,
      code_hash: codeHash,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: "No se pudo generar el código. Inténtalo otra vez." };
  }

  const email = buildVerificationEmail(code, input.purpose);
  const sent = await sendTransactionalEmail({
    to: input.email,
    ...email,
    idempotencyKey: `employee-${input.purpose}-${data.id}`,
  });
  if (!sent.sent) {
    await db.from("employee_account_verifications").delete().eq("id", data.id);
    return { ok: false as const, error: "No se pudo enviar el código por correo." };
  }

  return {
    ok: true as const,
    verificationId: data.id,
    emailHint: maskEmail(input.email),
    expiresIn: CODE_MINUTES * 60,
  };
}

export async function getEmployeeAccountStatus(user: SessionUser) {
  if (!user.employeeId) return { pending: false, email: null };
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Base de datos no configurada");
  const { data, error } = await db
    .from("users")
    .select("email,email_verified_at,must_set_password")
    .eq("employee_key", user.employeeId)
    .maybeSingle();
  if (error || !data) throw new Error("Cuenta de empleado no encontrada");
  const usableEmail = normalizeStaffEmail(data.email);
  return {
    pending: data.must_set_password || !data.email_verified_at || !usableEmail,
    email: usableEmail,
    emailHint: usableEmail ? maskEmail(usableEmail) : null,
  };
}

export async function requestActivationCode(user: SessionUser, rawEmail: string) {
  if (!user.employeeId || user.authMethod !== "legacy_pin") {
    return { ok: false as const, error: "Esta cuenta no necesita activación." };
  }
  const email = normalizeStaffEmail(rawEmail);
  if (!email) return { ok: false as const, error: "Escribe un correo personal válido." };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false as const, error: "Base de datos no configurada" };
  const { data: duplicate, error } = await db
    .from("users")
    .select("employee_key")
    .ilike("email", email)
    .neq("employee_key", user.employeeId)
    .limit(1);
  if (error) return { ok: false as const, error: "No se pudo comprobar el correo." };
  if (duplicate?.length) return { ok: false as const, error: "Ese correo ya pertenece a otra cuenta." };
  return createAndSendVerification({ employeeKey: user.employeeId, email, purpose: "activation" });
}

export async function requestPasswordReset(rawEmail: string) {
  const email = normalizeStaffEmail(rawEmail);
  if (!email) return { ok: true as const, verificationId: crypto.randomUUID(), emailHint: null };
  const db = getSupabaseAdmin();
  if (!db) return { ok: true as const, verificationId: crypto.randomUUID(), emailHint: null };
  const { data } = await db
    .from("users")
    .select("employee_key,email,must_set_password,email_verified_at")
    .ilike("email", email)
    .maybeSingle();
  if (!data?.employee_key || data.must_set_password || !data.email_verified_at) {
    return { ok: true as const, verificationId: crypto.randomUUID(), emailHint: maskEmail(email) };
  }
  return createAndSendVerification({
    employeeKey: data.employee_key,
    email: data.email.toLowerCase(),
    purpose: "password_reset",
  });
}

export async function completePasswordChange(input: {
  verificationId: string;
  code: string;
  password: string;
  purpose: VerificationPurpose;
  employeeKey?: string;
  email?: string;
}) {
  const passwordError = validateEmployeePassword(input.password);
  if (passwordError) return { ok: false as const, status: 400, error: passwordError };
  if (!/^\d{6}$/.test(input.code)) {
    return { ok: false as const, status: 400, error: "El código debe tener 6 cifras." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false as const, status: 503, error: "Base de datos no configurada" };

  let query = db
    .from("employee_account_verifications")
    .select("*")
    .eq("id", input.verificationId)
    .eq("purpose", input.purpose)
    .is("used_at", null);
  if (input.employeeKey) query = query.eq("employee_key", input.employeeKey);
  if (input.email) query = query.ilike("email", input.email.trim().toLowerCase());
  const { data: verification, error } = await query.maybeSingle();
  if (error || !verification || new Date(verification.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, status: 400, error: "El código ha caducado. Pide uno nuevo." };
  }
  if (verification.attempts >= verification.max_attempts) {
    return { ok: false as const, status: 429, error: "Demasiados intentos. Pide un código nuevo." };
  }
  if (!(await bcrypt.compare(input.code, verification.code_hash))) {
    await db
      .from("employee_account_verifications")
      .update({ attempts: verification.attempts + 1 })
      .eq("id", verification.id);
    return { ok: false as const, status: 400, error: "Código incorrecto." };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const { data: changed, error: changeError } = await db.rpc(
    "complete_employee_password_change",
    {
      p_verification_id: verification.id,
      p_employee_key: verification.employee_key,
      p_email: verification.email,
      p_password_hash: passwordHash,
    },
  );
  const account = changed?.[0];
  if (changeError || !account) {
    return { ok: false as const, status: 503, error: "No se pudo guardar la contraseña." };
  }
  return {
    ok: true as const,
    employeeKey: verification.employee_key,
    email: verification.email,
    name: account.account_name,
    role: account.role_id,
    sessionVersion: account.session_version,
  };
}
