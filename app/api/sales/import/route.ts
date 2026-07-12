import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, isSalesAdmin } from "@/lib/auth/guards";
import {
  parseRestosuiteCsvDetailed,
  IMPORT_ERROR_MESSAGES,
  type RowError,
} from "@/lib/restosuite/csvImport";
import { normalizeSalesPayload, registroToDailySales } from "@/lib/sales-sync/normalize";
import {
  isSalesDbConfigured,
  upsertDailySales,
  logImport,
  type ImportLogEntry,
} from "@/lib/sales-sync/supabaseRepo";
import { getDefaultLocationId, MAX_IMPORT_FILE_BYTES } from "@/lib/sales-sync/config";
import type { DailySalesRecord } from "@/lib/sales-sync/types";
import type { RegistroRestosuite } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type BuildResult = {
  records: DailySalesRecord[];
  totalRows: number;
  skipped: RowError[];
  fileName: string | null;
  source: string;
};

type ClientError = { status: number; message: string };

function fail(status: number, message: string): ClientError {
  return { status, message };
}

function isClientError(value: unknown): value is ClientError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value
  );
}

function buildFromCsv(
  text: string,
  fileName: string | null,
  locationId: string,
  source: string,
  syncedAt: string,
): BuildResult | ClientError {
  const parsed = parseRestosuiteCsvDetailed(text, fileName ?? "import.csv");
  if (!parsed.ok) {
    const label = parsed.error ? IMPORT_ERROR_MESSAGES[parsed.error] : "Formato no válido";
    const detail = parsed.missingColumns?.length
      ? `${label}: ${parsed.missingColumns.join(", ")}`
      : label;
    return fail(422, detail);
  }
  return {
    records: parsed.registros.map((r) =>
      registroToDailySales(r, { locationId, source, syncedAt }),
    ),
    totalRows: parsed.totalDataRows,
    skipped: parsed.skipped,
    fileName,
    source,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Autenticación: solo cuentas de gestión (owner/manager) pueden importar.
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  if (!isSalesAdmin(user)) {
    return NextResponse.json(
      { error: "No tienes permisos para importar ventas" },
      { status: 403 },
    );
  }

  if (!isSalesDbConfigured()) {
    return NextResponse.json(
      { error: "La base de datos de ventas no está configurada" },
      { status: 503 },
    );
  }

  const locationId = getDefaultLocationId();
  const syncedAt = new Date().toISOString();
  const contentType = request.headers.get("content-type") || "";

  let built: BuildResult | ClientError;

  try {
    if (contentType.includes("multipart/form-data")) {
      // --- Fichero CSV subido ---
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        built = fail(400, "Falta el fichero CSV (campo 'file')");
      } else if (file.size > MAX_IMPORT_FILE_BYTES) {
        built = fail(
          413,
          `El fichero supera el límite de ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB`,
        );
      } else {
        const source = (form.get("source") as string) || "csv";
        built = buildFromCsv(await file.text(), file.name, locationId, source, syncedAt);
      }
    } else {
      // --- JSON: { csv } | { registros } | { records } ---
      const body = (await request.json()) as {
        csv?: string;
        fileName?: string;
        source?: string;
        registros?: RegistroRestosuite[];
        records?: unknown;
      };

      if (typeof body.csv === "string") {
        if (Buffer.byteLength(body.csv, "utf8") > MAX_IMPORT_FILE_BYTES) {
          built = fail(413, "El CSV supera el límite de tamaño");
        } else {
          built = buildFromCsv(
            body.csv,
            body.fileName ?? null,
            locationId,
            body.source || "csv",
            syncedAt,
          );
        }
      } else if (Array.isArray(body.registros)) {
        const source = body.source || "localStorage-migration";
        const records = body.registros
          .map((r) => registroToDailySales(r, { locationId, source, syncedAt }))
          .filter((r) => r.date && r.netSales > 0);
        built = {
          records,
          totalRows: body.registros.length,
          skipped: [],
          fileName: body.fileName ?? null,
          source,
        };
      } else if (body.records !== undefined) {
        const source = body.source || "blob-migration";
        const records = normalizeSalesPayload(body.records, {
          fallbackDate: syncedAt.slice(0, 10),
          source,
          locationId,
        });
        built = {
          records,
          totalRows: Array.isArray(body.records) ? body.records.length : records.length,
          skipped: [],
          fileName: body.fileName ?? null,
          source,
        };
      } else {
        built = fail(400, "Cuerpo no reconocido: usa 'csv', 'registros' o 'records'");
      }
    }
  } catch {
    built = fail(400, "No se pudo leer la petición");
  }

  if (isClientError(built)) {
    await logImport({
      source: "csv",
      fileName: null,
      totalRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      status: "error",
      errorMessage: built.message,
    });
    return NextResponse.json({ error: built.message }, { status: built.status });
  }

  const skippedRows = built.skipped.length;

  if (built.records.length === 0) {
    const entry: ImportLogEntry = {
      source: built.source,
      fileName: built.fileName,
      totalRows: built.totalRows,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows,
      status: skippedRows > 0 ? "partial" : "error",
      errorMessage: "No se encontraron filas válidas",
    };
    await logImport(entry);
    return NextResponse.json(
      {
        error: "No se encontraron filas válidas",
        inserted: 0,
        updated: 0,
        skipped: skippedRows,
        total: built.totalRows,
        errors: built.skipped,
      },
      { status: 422 },
    );
  }

  try {
    const { inserted, updated } = await upsertDailySales(built.records);
    const status: ImportLogEntry["status"] = skippedRows > 0 ? "partial" : "success";
    await logImport({
      source: built.source,
      fileName: built.fileName,
      totalRows: built.totalRows,
      insertedRows: inserted,
      updatedRows: updated,
      skippedRows,
      status,
    });

    return NextResponse.json(
      {
        success: true,
        inserted,
        updated,
        skipped: skippedRows,
        total: built.totalRows,
        errors: built.skipped,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar ventas";
    await logImport({
      source: built.source,
      fileName: built.fileName,
      totalRows: built.totalRows,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows,
      status: "error",
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
