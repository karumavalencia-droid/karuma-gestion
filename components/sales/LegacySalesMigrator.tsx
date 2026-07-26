"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpFromLine, CheckCircle2, Database, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STORAGE_KEY } from "@/lib/objetivo/helpers";
import type { RegistroRestosuite } from "@/lib/types";

const MIGRATED_FLAG = "karuma_sales_migrated_v1";

type LegacySalesMigratorProps = {
  onMigrated?: () => void;
};

function readLocalRegistros(): RegistroRestosuite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { registros?: unknown };
    if (!Array.isArray(parsed.registros)) return [];
    return parsed.registros.filter(
      (r): r is RegistroRestosuite =>
        Boolean(r) && typeof (r as RegistroRestosuite).fecha === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Migración puntual de datos antiguos de ventas hacia el servidor.
 * - localStorage (karuma_restosuite_kpi_v1): el usuario debe confirmar; no se
 *   borra el dato local; se marca como migrado tras el éxito.
 * - blob JSON: solo se ofrece si el servidor detecta registros reales.
 */
export function LegacySalesMigrator({ onMigrated }: LegacySalesMigratorProps) {
  const [localCount, setLocalCount] = useState(0);
  const [alreadyMigrated, setAlreadyMigrated] = useState(false);
  const [blobCount, setBlobCount] = useState(0);
  const [busy, setBusy] = useState<null | "local" | "blob">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setLocalCount(readLocalRegistros().length);
    setAlreadyMigrated(localStorage.getItem(MIGRATED_FLAG) === "1");
    // ¿Hay datos reales en el blob antiguo? (solo admin puede consultar)
    fetch("/api/sales/migrate-blob", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number") setBlobCount(data.count);
      })
      .catch(() => undefined);
  }, []);

  const migrateLocal = useCallback(async () => {
    const registros = readLocalRegistros();
    if (registros.length === 0) return;
    setBusy("local");
    setMessage(null);
    try {
      const response = await fetch("/api/sales/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          registros,
          source: "localStorage-migration",
          fileName: "localStorage",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error ?? "No se pudo migrar el histórico local.");
        return;
      }
      // Marcar como migrado; NO borramos el dato local (rollback manual posible).
      localStorage.setItem(MIGRATED_FLAG, "1");
      setAlreadyMigrated(true);
      setMessage(
        `Histórico local migrado: ${data.inserted} nuevo(s), ${data.updated} actualizado(s). ` +
          "Los datos locales NO se han borrado.",
      );
      setConfirming(false);
      onMigrated?.();
    } catch {
      setMessage("Error de red al migrar el histórico local.");
    } finally {
      setBusy(null);
    }
  }, [onMigrated]);

  const migrateBlob = useCallback(async () => {
    setBusy("blob");
    setMessage(null);
    try {
      const response = await fetch("/api/sales/migrate-blob", {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error ?? "No se pudo migrar el blob.");
        return;
      }
      setBlobCount(0);
      setMessage(
        `Blob migrado: ${data.inserted} nuevo(s), ${data.updated} actualizado(s).`,
      );
      onMigrated?.();
    } catch {
      setMessage("Error de red al migrar el blob.");
    } finally {
      setBusy(null);
    }
  }, [onMigrated]);

  const showLocal = localCount > 0 && !alreadyMigrated;
  const showBlob = blobCount > 0;

  if (!showLocal && !showBlob && !message) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:mb-6">
      <div className="mb-2 flex items-center gap-2">
        <HardDriveDownload className="h-4 w-4 text-amber-700" />
        <h2 className="text-sm font-semibold text-amber-900">Migrar datos antiguos al servidor</h2>
      </div>

      {message && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {showLocal && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-amber-800 sm:text-sm">
            Este navegador tiene <strong>{localCount}</strong> día(s) de ventas guardados
            localmente. Súbelos al servidor para verlos en todos los dispositivos.
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={migrateLocal} disabled={busy !== null}>
                {busy === "local" ? "Migrando…" : "Confirmar subida"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={busy !== null}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Migrar datos locales
            </Button>
          )}
        </div>
      )}

      {showBlob && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 pt-2">
          <p className="text-xs text-amber-800 sm:text-sm">
            El almacenamiento antiguo (blob) tiene <strong>{blobCount}</strong> día(s).
            Migrarlos a la base de datos.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={migrateBlob}
            disabled={busy !== null}
          >
            <Database className="h-4 w-4" />
            {busy === "blob" ? "Migrando…" : "Migrar blob"}
          </Button>
        </div>
      )}
    </div>
  );
}
