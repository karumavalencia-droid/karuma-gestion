// ─── Auditoría de la zona privada ─────────────────────────────────────────────
// Registra acciones sensibles en private_audit_logs con service role.
// REGLA: nunca se guardan importes en claro, tokens, secretos MFA ni cuentas
// completas. Solo metadatos no sensibles (acción, recurso, id, conteos).

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "download"
  | "upload"
  | "mfa_enroll"
  | "mfa_verify";

export interface AuditEntry {
  actorId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  request?: Request;
  meta?: Record<string, unknown>;
}

// Claves que NUNCA deben acabar en el meta del log.
const FORBIDDEN_META_KEYS =
  /(amount|cents|gross|net|salary|iban|account|token|secret|password|otp|code|recovery)/i;

function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.test(k)) continue;
    if (typeof v === "string" && v.length > 200) continue;
    if (typeof v === "object" && v !== null) continue; // solo escalares
    out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Escribe una entrada de auditoría. Best-effort: no lanza (un fallo de log no
 * debe tumbar la operación), pero registra el problema en consola sin datos
 * sensibles.
 */
export async function writePrivateAudit(entry: AuditEntry): Promise<void> {
  // Tabla privada no incluida en el tipo Database: cliente sin tipar.
  const admin = getSupabaseAdmin() as unknown as SupabaseClient | null;
  if (!admin) return;

  const ip =
    entry.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    entry.request?.headers.get("x-real-ip") ??
    null;
  const userAgent = entry.request?.headers.get("user-agent")?.slice(0, 300) ?? null;

  try {
    await admin.from("private_audit_logs").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId ?? null,
      ip,
      user_agent: userAgent,
      meta: sanitizeMeta(entry.meta),
    });
  } catch {
    // No propagar; no imprimir datos sensibles.
    console.warn("[owner-audit] no se pudo registrar la auditoría");
  }
}
