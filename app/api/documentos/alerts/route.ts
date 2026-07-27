import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumentoAdmin } from "@/lib/documentos/repository";

export const dynamic = "force-dynamic";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const today = new Date();
  const ninetyDays = new Date(today);
  ninetyDays.setUTCDate(ninetyDays.getUTCDate() + 90);
  const supabase = getDocumentoAdmin();
  try {
    const [unpaid, expiring, duplicates, legalPending, aiFailures] = await Promise.all([
      supabase.from("documentos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("document_type", "invoice").in("payment_status", ["pending", "unpaid", "due"]),
      supabase.from("documentos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("document_type", "contract").gte("contract_end_date", isoDate(today)).lte("contract_end_date", isoDate(ninetyDays)),
      supabase.from("document_duplicate_candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("documentos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("legal_delivery_status", "pending"),
      supabase.from("documentos").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "failed"),
    ]);
    const errors = [unpaid, expiring, duplicates, legalPending, aiFailures].map((result) => result.error).filter(Boolean);
    if (errors.length) throw errors[0];
    return NextResponse.json({ unpaidInvoices: unpaid.count || 0, expiringContracts: expiring.count || 0, duplicateCandidates: duplicates.count || 0, legalPending: legalPending.count || 0, aiFailures: aiFailures.count || 0 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[documentos] alerts failed", error);
    return NextResponse.json({ error: "No se pudieron cargar las alertas" }, { status: 500 });
  }
}
