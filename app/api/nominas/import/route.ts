import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { extractText, getDocumentProxy } from "unpdf";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getDocumentoBucket } from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 80;

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type StaffPayroll = {
  id: string;
  name: string;
  payroll_name: string;
};

type ImportResult = {
  employee_id: string;
  employee_name: string;
  pages: number[];
  documento_id?: string;
  status: "created" | "already_exists" | "error";
  error?: string;
};

export async function POST(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const periodo = String(form.get("periodo") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "PDF requerido" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx. 25 MB)" }, { status: 400 });
  }
  if (!/^(\d{4})-(0[1-9]|1[0-2])$/.test(periodo)) {
    return NextResponse.json({ error: "periodo debe tener formato YYYY-MM" }, { status: 400 });
  }

  const { data: staffRows, error: staffError } = await supabase
    .from("staff")
    .select("id,name,payroll_name")
    .not("payroll_name", "is", null);

  if (staffError) {
    console.error("[nominas/import] Error cargando empleados:", staffError);
    return NextResponse.json({ error: "No se pudieron cargar los empleados" }, { status: 500 });
  }

  const staff = (staffRows ?? [])
    .filter((row) => typeof row.payroll_name === "string" && row.payroll_name.trim())
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      payroll_name: row.payroll_name as string,
    })) as StaffPayroll[];

  if (staff.length === 0) {
    return NextResponse.json({ error: "No hay nombres de nómina configurados en empleados" }, { status: 400 });
  }

  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  let sourcePdf: PDFDocument;
  try {
    sourcePdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  } catch (loadError) {
    console.error("[nominas/import] PDF inválido:", loadError);
    return NextResponse.json({ error: "No se pudo leer el PDF" }, { status: 400 });
  }

  const pageCount = sourcePdf.getPageCount();
  if (pageCount < 1 || pageCount > MAX_PAGES) {
    return NextResponse.json({ error: `El PDF debe tener entre 1 y ${MAX_PAGES} páginas` }, { status: 400 });
  }

  let pageTexts: string[];
  try {
    const proxy = await getDocumentProxy(sourceBytes);
    const extracted = await extractText(proxy, { mergePages: false });
    pageTexts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    await proxy.destroy();
  } catch (extractError) {
    console.error("[nominas/import] Error extrayendo texto:", extractError);
    return NextResponse.json({ error: "No se pudo identificar a los empleados dentro del PDF" }, { status: 400 });
  }

  const normalizedStaff = staff.map((employee) => ({
    employee,
    legalName: normalizeName(employee.payroll_name),
  }));

  const pagesByEmployee = new Map<string, { employee: StaffPayroll; pages: number[] }>();
  const unmatchedPages: number[] = [];
  const ambiguousPages: number[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageText = normalizeName(pageTexts[pageIndex] ?? "");
    const matches = normalizedStaff.filter(({ legalName }) => legalName && pageText.includes(legalName));

    if (matches.length === 0) {
      unmatchedPages.push(pageIndex + 1);
      continue;
    }
    if (matches.length > 1) {
      ambiguousPages.push(pageIndex + 1);
      continue;
    }

    const employee = matches[0].employee;
    const current = pagesByEmployee.get(employee.id) ?? { employee, pages: [] };
    current.pages.push(pageIndex);
    pagesByEmployee.set(employee.id, current);
  }

  const bucket = getDocumentoBucket("nominas");
  const results: ImportResult[] = [];

  for (const { employee, pages } of pagesByEmployee.values()) {
    const pageNumbers = pages.map((page) => page + 1);

    const { data: existing, error: existingError } = await supabase
      .from("documentos")
      .select("id")
      .eq("categoria", "nominas")
      .eq("employee_id", employee.id)
      .eq("periodo", periodo)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      results.push({
        employee_id: employee.id,
        employee_name: employee.name,
        pages: pageNumbers,
        status: "error",
        error: "No se pudo comprobar si la nómina ya existía",
      });
      continue;
    }

    if (existing) {
      results.push({
        employee_id: employee.id,
        employee_name: employee.name,
        pages: pageNumbers,
        documento_id: existing.id,
        status: "already_exists",
      });
      continue;
    }

    try {
      const personalPdf = await PDFDocument.create();
      const copiedPages = await personalPdf.copyPages(sourcePdf, pages);
      for (const page of copiedPages) personalPdf.addPage(page);
      const personalBytes = await personalPdf.save();
      const personalBuffer = Buffer.from(personalBytes);
      const sha256 = createHash("sha256").update(personalBuffer).digest("hex");
      const safeEmployee = employee.name.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
      const filename = `Nomina_${periodo}_${safeEmployee || employee.id}.pdf`;
      const storagePath = `nominas/${employee.id}/${periodo}/${Date.now()}-${filename}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, personalBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: created, error: insertError } = await supabase
        .from("documentos")
        .insert({
          nombre: filename,
          title: `Nómina ${periodo} - ${employee.name}`,
          original_filename: file.name,
          categoria: "nominas",
          storage_path: storagePath,
          storage_bucket: bucket,
          mime_type: "application/pdf",
          tamano_bytes: personalBuffer.byteLength,
          file_size: personalBuffer.byteLength,
          empleado_id: employee.id,
          employee_id: employee.id,
          periodo,
          tipo_documento: "employee_document",
          document_type: "employee_document",
          source_type: "bulk_payroll_import",
          source: "bulk_payroll_import",
          file_sha256: sha256,
          sha256,
          status: "uploaded",
          processing_status: "stored",
          metadata: {
            storage_bucket: bucket,
            payroll_name: employee.payroll_name,
            source_filename: file.name,
            source_pages: pageNumbers,
            imported_by: "payroll_auto_split",
          },
        })
        .select("id")
        .single();

      if (insertError || !created) {
        await supabase.storage.from(bucket).remove([storagePath]);
        throw insertError ?? new Error("No se pudo guardar el documento");
      }

      results.push({
        employee_id: employee.id,
        employee_name: employee.name,
        pages: pageNumbers,
        documento_id: created.id,
        status: "created",
      });
    } catch (importError) {
      console.error(`[nominas/import] Error importando ${employee.id}:`, importError);
      results.push({
        employee_id: employee.id,
        employee_name: employee.name,
        pages: pageNumbers,
        status: "error",
        error: "No se pudo guardar esta nómina",
      });
    }
  }

  const createdCount = results.filter((item) => item.status === "created").length;
  const existingCount = results.filter((item) => item.status === "already_exists").length;
  const errorCount = results.filter((item) => item.status === "error").length;

  return NextResponse.json({
    periodo,
    total_pages: pageCount,
    created: createdCount,
    already_exists: existingCount,
    errors: errorCount,
    unmatched_pages: unmatchedPages,
    ambiguous_pages: ambiguousPages,
    results,
  });
}
