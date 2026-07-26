"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  IMPORT_ERROR_MESSAGES,
  parseRestosuiteCsv,
  type ImportPreview,
} from "@/lib/restosuite/csvImport";
import { formatCurrency } from "@/lib/utils";

export type ImportSummary = {
  inserted: number;
  updated: number;
  skipped: number;
};

type RowError = { line: number; reason: string };

interface RestosuiteCsvImporterProps {
  onImported?: (summary: ImportSummary) => void;
  compact?: boolean;
}

export function RestosuiteCsvImporter({
  onImported,
  compact = false,
}: RestosuiteCsvImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setPreview(null);
    setPendingFile(null);
    setRowErrors([]);
    setLoading(true);

    try {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
        setError(`${IMPORT_ERROR_MESSAGES.formato_invalido}. Usa un archivo CSV exportado desde el TPV (Restosuite / Palmier Pro).`);
        return;
      }

      const text = await file.text();
      const result = parseRestosuiteCsv(text, file.name);

      if (!result.ok) {
        if (result.error === "faltan_columnas" && result.missingColumns) {
          setError(
            `${IMPORT_ERROR_MESSAGES.faltan_columnas}: ${result.missingColumns.join(", ")}`,
          );
        } else if (result.error) {
          setError(IMPORT_ERROR_MESSAGES[result.error]);
        } else {
          setError(IMPORT_ERROR_MESSAGES.formato_invalido);
        }
        return;
      }

      setPreview(result.preview ?? null);
      setPendingFile(file);
    } catch {
      setError(IMPORT_ERROR_MESSAGES.formato_invalido);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    setError(null);
    setRowErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("source", "csv");

      const response = await fetch("/api/sales/import", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "No se pudo importar el archivo.");
        if (Array.isArray(data?.errors)) setRowErrors(data.errors);
        return;
      }

      const inserted = Number(data.inserted ?? 0);
      const updated = Number(data.updated ?? 0);
      const skipped = Number(data.skipped ?? 0);
      setSuccess(
        `Importado: ${inserted} nuevo(s), ${updated} actualizado(s)` +
          (skipped > 0 ? `, ${skipped} omitido(s)` : "") +
          ". Datos guardados en el servidor.",
      );
      if (Array.isArray(data.errors)) setRowErrors(data.errors);
      setPreview(null);
      setPendingFile(null);
      onImported?.({ inserted, updated, skipped });
    } catch {
      setError("Error de red al subir el archivo. Inténtalo de nuevo.");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setPendingFile(null);
    setError(null);
    setSuccess(null);
    setRowErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section
      className={`rounded-xl border border-indigo-200 bg-indigo-50/50 shadow-sm ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <FileUp className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Importar CSV del TPV (Restosuite / Palmier Pro)
            </h2>
          </div>
          {!compact && (
            <p className="text-xs text-gray-500">
              Sube un CSV/Excel exportado (guardar como CSV). Se guarda en el servidor y
              actualiza Objetivo 100K, Centro de Datos y Panel automáticamente.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-indigo-300 bg-white hover:bg-indigo-50"
            disabled={loading || importing}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {loading ? "Leyendo…" : "Importar CSV del TPV"}
          </Button>
        </div>
      </div>

      <p className="mb-3 text-[10px] leading-relaxed text-gray-500 sm:text-xs">
        Columnas reconocidas: Fecha · Ventas / Net Sales · Clientes / Guests · Ticket medio /
        Average spend · Facturas / Bill Count · Bebidas · Observaciones
      </p>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="mb-1 font-semibold">
            {rowErrors.length} fila(s) omitida(s):
          </p>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto">
            {rowErrors.slice(0, 20).map((row) => (
              <li key={row.line}>
                Línea {row.line}: {row.reason}
              </li>
            ))}
            {rowErrors.length > 20 && <li>… y {rowErrors.length - 20} más</li>}
          </ul>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-indigo-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Vista previa de importación
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <dt className="text-xs text-gray-500">Archivo</dt>
              <dd className="truncate font-medium text-gray-900">{preview.fileName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Filas</dt>
              <dd className="font-medium text-gray-900">{preview.rowCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Ventas totales</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(preview.totalVentas)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Clientes totales</dt>
              <dd className="font-medium text-gray-900">{preview.totalClientes}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Ticket medio</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrency(preview.ticketMedioPromedio)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleConfirmImport} disabled={importing}>
              {importing ? "Importando…" : "Confirmar importación"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} disabled={importing}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
