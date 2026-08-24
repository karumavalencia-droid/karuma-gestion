import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { importDocumentoDriveFolder } from "@/lib/documentos/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  let body: { folderId?: unknown; limit?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { /* optional body */ }
  try {
    const result = await importDocumentoDriveFolder({
      actorEmail: user.email,
      folderId: typeof body.folderId === "string" ? body.folderId : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[documentos] drive import failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar Drive" }, { status: 502 });
  }
}
