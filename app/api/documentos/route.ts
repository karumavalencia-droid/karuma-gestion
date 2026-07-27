import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { createProcessingRun, getDocumentoAdmin, listDocumentos } from "@/lib/documentos/repository";
import { deleteDocumentoObject, uploadDocumentoObject } from "@/lib/documentos/storage";
import { DOCUMENTO_BUCKET } from "@/lib/documentos/types";
import { inferDocumentoType, isDocumentoStatus, isDocumentoType, validateDocumentoFile } from "@/lib/documentos/validation";
import { detectDocumentoDuplicates } from "@/lib/documentos/associations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ error: "Sin permisos para acceder a Documento" }, { status: 403 });
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function validNumber(value: string | null) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validId(value: string | null) {
  return value && /^[a-zA-Z0-9-]{1,80}$/.test(value) ? value : undefined;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return forbidden();

  const params = request.nextUrl.searchParams;
  try {
    const requestedStatus = params.get("status");
    const requestedType = params.get("type");
    const result = await listDocumentos({
      query: params.get("q") ?? undefined,
      status: isDocumentoStatus(requestedStatus) ? requestedStatus : undefined,
      documentType: isDocumentoType(requestedType) ? requestedType : undefined,
      category: params.get("category") ?? undefined,
      companyId: validId(params.get("companyId")),
      restaurantId: validId(params.get("restaurantId")),
      supplierId: validNumber(params.get("supplierId")),
      dateFrom: validDate(params.get("dateFrom")),
      dateTo: validDate(params.get("dateTo")),
      amountMin: validNumber(params.get("amountMin")),
      amountMax: validNumber(params.get("amountMax")),
      paymentStatus: params.get("paymentStatus")?.trim().slice(0, 80) || undefined,
      humanVerified: params.get("humanVerified") === "true" ? true : params.get("humanVerified") === "false" ? false : undefined,
      reviewQueue: params.get("reviewQueue") === "true",
      limit: validNumber(params.get("limit")),
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[documentos] list failed", error);
    return NextResponse.json({ error: "No se pudieron cargar los documentos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return forbidden();

  let objectPath: string | null = null;
  try {
    const form = await request.formData();
    const formFile = form.get("file");
    const note = typeof form.get("note") === "string" ? String(form.get("note")).trim() : "";
    const file = formFile instanceof File
      ? formFile
      : note
        ? new File([note], "nota.txt", { type: "text/plain" })
        : null;
    if (!file) return NextResponse.json({ error: "Falta el archivo o la nota" }, { status: 400 });

    const fileError = validateDocumentoFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 413 });

    const documentId = randomUUID();
    const mimeType = file.type || "application/octet-stream";
    const requestedType = String(form.get("documentType") ?? "");
    if (requestedType && !isDocumentoType(requestedType)) return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
    const documentType = requestedType || inferDocumentoType(mimeType, file.name);
    const title = String(form.get("title") ?? file.name).trim().slice(0, 240) || file.name;
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadDocumentoObject({
      bytes,
      filename: file.name,
      mimeType,
      documentId,
      documentType,
    });
    objectPath = uploaded.path;

    const { data, error } = await getDocumentoAdmin()
      .from("documentos")
      .insert({
        id: documentId,
        nombre: title,
        title,
        original_filename: file.name,
        categoria: "otros",
        storage_path: uploaded.path,
        storage_bucket: DOCUMENTO_BUCKET,
        mime_type: mimeType,
        tamano_bytes: file.size,
        file_size: file.size,
        document_type: documentType,
        status: "uploaded",
        notas: note || null,
        extracted_text: note || null,
        source: "manual_upload",
        sha256: uploaded.sha256,
        uploaded_at: new Date().toISOString(),
        created_by_email: user.email,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo guardar el documento");

    try {
      await createProcessingRun(documentId, user.email);
    } catch (processingError) {
      console.error("[documentos] processing run failed", processingError);
    }
    try {
      await detectDocumentoDuplicates(documentId);
    } catch (duplicateError) {
      // Candidate detection is additive and must not invalidate a successfully saved original.
      console.error("[documentos] duplicate detection skipped", duplicateError);
    }

    return NextResponse.json({ documento: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (objectPath) {
      try { await deleteDocumentoObject(objectPath); } catch (cleanupError) { console.error("[documentos] orphan cleanup failed", cleanupError); }
    }
    console.error("[documentos] upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir el documento" }, { status: 500 });
  }
}
