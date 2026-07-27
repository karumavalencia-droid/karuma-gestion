import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import {
  getDocumento,
  getDocumentoAdmin,
  mapInvoiceItemRow,
} from "@/lib/documentos/repository";
import { parseDocumentoInvoiceItems } from "@/lib/documentos/invoice-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;

  const documento = await getDocumento(id);
  if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  if (documento.document_type !== "invoice") {
    return NextResponse.json({ error: "Solo se pueden editar líneas en documentos de tipo factura" }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  let items;
  try {
    items = parseDocumentoInvoiceItems(body.items);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Líneas de factura inválidas" },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await getDocumentoAdmin().rpc("replace_document_invoice_items", {
      p_document_id: id,
      p_items: items,
      p_actor_email: user.email,
    });
    if (error) throw new Error(error.message);

    const updatedDocumento = await getDocumento(id);
    if (!updatedDocumento) throw new Error("El documento dejó de estar disponible");
    return NextResponse.json(
      {
        documento: updatedDocumento,
        invoiceItems: (Array.isArray(data) ? data : []).map((row) => mapInvoiceItemRow(row as Record<string, unknown>)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[documentos] invoice items update failed", { id, error });
    return NextResponse.json(
      { error: "No se pudieron guardar las líneas. Comprueba que la migration 044 esté aplicada." },
      { status: 500 },
    );
  }
}
