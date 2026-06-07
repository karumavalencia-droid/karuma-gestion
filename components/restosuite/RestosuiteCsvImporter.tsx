"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  IMPORT_ERROR_MESSAGES,
  mergeImportToStore,
  parseRestosuiteCsv,
  type ImportPreview,
} from "@/lib/restosuite/csvImport";
import { formatCurrency } from "@/lib/utils";

interface RestosuiteCsvImporterProps {
  onImported?: (summary: { imported: number; updated: number }) => void;
  compact?: boolean;
}

export function RestosuiteCsvImporter({
  onImported,
  compact = false,
}: RestosuiteCsvImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setPreview(null);
    setLoading(true);

    try {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
        setError(`${IMPORT_ERROR_MESSAGES.formato_invalido}. Usa un archivo CSV exportado desde Restosuite.`);
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
    } catch {
      setError(IMPORT_ERROR_MESSAGES.formato_invalido);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    const summary = mergeImportToStore(preview.registros);
    setSuccess(
      `Importado: ${summary.imported} nuevo(s), ${summary.updated} actualizado(s). Objetivo 100K y Centro de Datos actualizados.`,
    );
    setPreview(null);
    onImported?.({ imported: summary.imported, updated: summary.updated });
  };

  const handleReset = () => {
    setPreview(null);
    setError(null);
    setSuccess(null);
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
            <h2 className="text-sm font-semibold text-gray-900">Importar CSV Restosuite</h2>
          </div>
          {!compact && (
            <p className="text-xs text-gray-500">
              Sube un CSV/Excel exportado (guardar como CSV). Actualiza Objetivo 100K y Centro de
              Datos automáticamente.
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
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {loading ? "Leyendo…" : "Importar CSV Restosuite"}
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
            <Button size="sm" onClick={handleConfirmImport}>
              Confirmar importación
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
