// GET /api/owner/audit — últimas entradas de auditoría (solo owner + aal2).
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOwnerApi, ownerJson, NO_STORE_HEADERS } from "@/lib/owner/guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;

  const db = getSupabaseAdmin() as unknown as SupabaseClient | null;
  if (!db) {
    return NextResponse.json(
      { error: "unavailable", message: "Base de datos no disponible." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const { data, error } = await db
    .from("private_audit_logs")
    .select("id, actor_email, action, resource, resource_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json(
      { error: "read_failed", message: "No se pudo leer la auditoría." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  return ownerJson({ items: data ?? [] });
}
