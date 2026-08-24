import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { importDocumentoGmailAttachments } from "@/lib/documentos/gmail";
import { isDocumentoOwner } from "@/lib/documentos/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  let body: { query?: unknown; limit?: unknown } = {};
  try { body = await request.json() as { query?: unknown; limit?: unknown }; } catch { /* optional body */ }
  const query = typeof body.query === "string" ? body.query.slice(0, 500) : undefined;
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.floor(body.limit) : undefined;
  try {
    const result = await importDocumentoGmailAttachments({ actorEmail: user.email, query, limit });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[documentos] gmail import failed", error);
    return NextResponse.json({ error: "No se pudieron importar adjuntos de Gmail" }, { status: 502 });
  }
}
