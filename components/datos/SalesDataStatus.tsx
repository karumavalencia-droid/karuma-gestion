"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

type SalesStatus = {
  configured: boolean;
  tableExists: boolean;
  totalRecords: number;
  firstDate: string | null;
  lastDate: string | null;
  lastSyncedAt: string | null;
  lastImport: {
    at: string;
    source: string;
    fileName: string | null;
    status: string;
    inserted: number;
    updated: number;
    skipped: number;
    errorMessage: string | null;
  } | null;
  mode: "csv-manual" | "api-auto";
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Estado de los datos de ventas (TPV Restosuite / Palmier Pro):
 * tabla, rango importado, última importación y modo actual.
 * `refreshToken` fuerza una recarga (p. ej. tras importar un CSV).
 */
export function SalesDataStatus({ refreshToken = 0 }: { refreshToken?: number }) {
  const [status, setStatus] = useState<SalesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/status", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStatus((await response.json()) as SalesStatus);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Estado de datos de ventas
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant={status?.mode === "api-auto" ? "info" : "warning"}>
            {status?.mode === "api-auto"
              ? "Sincronización API"
              : "Importación manual CSV"}
          </StatusBadge>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Actualizar estado"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !status ? (
        <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Comprobando estado…
        </div>
      ) : error ? (
        <p className="py-2 text-sm text-red-700">
          No se pudo comprobar el estado de los datos.
        </p>
      ) : status ? (
        <>
          {!status.tableExists && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                La tabla <code className="font-mono">sales_daily</code> no existe
                todavía en Supabase. Ejecuta la migración{" "}
                <code className="font-mono">026_sales.sql</code> en el SQL Editor
                antes de importar.
              </span>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Base de datos</dt>
              <dd className="flex items-center gap-1 font-medium text-gray-900">
                {status.tableExists ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Tabla lista
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Falta migración
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Días importados</dt>
              <dd className="font-medium text-gray-900">{status.totalRecords}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Rango de fechas</dt>
              <dd className="font-medium text-gray-900">
                {status.firstDate
                  ? `${formatDate(status.firstDate)} – ${formatDate(status.lastDate)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Última sincronización</dt>
              <dd className="font-medium text-gray-900">
                {formatDateTime(status.lastSyncedAt)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">Última importación</dt>
              <dd className="flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
                {status.lastImport ? (
                  <>
                    <FileUp className="h-3.5 w-3.5 text-gray-400" />
                    {formatDateTime(status.lastImport.at)}
                    {status.lastImport.fileName ? ` · ${status.lastImport.fileName}` : ""}
                    {` · ${status.lastImport.source}`}
                    <StatusBadge
                      variant={status.lastImport.status === "success" ? "success" : "warning"}
                    >
                      {status.lastImport.status === "success"
                        ? `OK (+${status.lastImport.inserted} / ~${status.lastImport.updated})`
                        : status.lastImport.status}
                    </StatusBadge>
                    {status.lastImport.errorMessage && (
                      <span className="text-xs text-red-600">
                        {status.lastImport.errorMessage}
                      </span>
                    )}
                  </>
                ) : (
                  "Sin importaciones registradas"
                )}
              </dd>
            </div>
          </dl>

          {status.mode === "csv-manual" && (
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              La sincronización automática con la API del TPV (Restosuite /
              Palmier Pro) no está activada: no hay credenciales oficiales. Los
              datos entran únicamente por importación manual de CSV.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
