import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumento } from "@/lib/documentos/repository";
import { createDocumentoSignedUrl } from "@/lib/documentos/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  try {
    const documento = await getDocumento(id);
    if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    const signedUrl = await createDocumentoSignedUrl(documento.storage_path, 300, documento.storage_bucket || undefined);
    return NextResponse.redirect(signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[documentos] signed url failed", error);
    return NextResponse.json({ error: "No se pudo abrir el archivo" }, { status: 500 });
  }
}
