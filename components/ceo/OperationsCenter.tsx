"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AlertStatus, DbOperationalAlert } from "@/lib/operations/types";

const severityStyle = {
  critical: "border-red-300 bg-red-50 text-red-800",
  high: "border-orange-300 bg-orange-50 text-orange-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-blue-200 bg-blue-50 text-blue-800",
};

export function OperationsCenter() {
  const [alerts, setAlerts] = useState<DbOperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ceo/operations?status=active", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar las alertas");
      setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateAlert(alert: DbOperationalAlert, status: AlertStatus) {
    const resolutionNote = status === "resolved"
      ? window.prompt("Nota de resolución (opcional)") ?? undefined
      : undefined;
    setWorkingId(alert.id);
    setError(null);
    try {
      const response = await fetch(`/api/ceo/operations/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar la alerta");
      if (status === "resolved" || status === "dismissed") {
        setAlerts((current) => current.filter((item) => item.id !== alert.id));
      } else {
        setAlerts((current) => current.map((item) => item.id === alert.id ? result.alert : item));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la alerta");
    } finally {
      setWorkingId(null);
    }
  }

  const counts = useMemo(() => ({
    critical: alerts.filter((alert) => alert.severity === "critical").length,
    high: alerts.filter((alert) => alert.severity === "high").length,
    total: alerts.length,
  }), [alerts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Control operativo</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">Excepciones que requieren decisión</h2>
          <p className="mt-2 text-sm text-gray-600">Una cola única para ventas, stock, compras, reservas y operaciones.</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Activas" value={counts.total} icon={Clock3} />
        <Metric label="Altas" value={counts.high} icon={AlertTriangle} />
        <Metric label="Críticas" value={counts.critical} icon={ShieldAlert} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? (
        <div className="flex min-h-32 items-center justify-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />No hay excepciones activas</div>
          <p className="mt-1 text-emerald-700">Los detectores de cada módulo aparecerán aquí cuando encuentren una desviación.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <article key={alert.id} className={`rounded-2xl border p-4 ${severityStyle[alert.severity]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">{alert.severity}</span>
                    <span className="text-xs opacity-70">{alert.source}</span>
                    {alert.owner_email && <span className="text-xs opacity-70">· {alert.owner_email}</span>}
                  </div>
                  <h3 className="mt-2 font-semibold text-gray-950">{alert.title}</h3>
                  <p className="mt-1 text-sm text-gray-700">{alert.description}</p>
                  {alert.suggested_action && <p className="mt-2 text-sm font-medium">Siguiente paso: {alert.suggested_action}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {alert.status === "open" && (
                    <Button size="sm" variant="secondary" disabled={workingId === alert.id} onClick={() => updateAlert(alert, "acknowledged")}>
                      Asumir
                    </Button>
                  )}
                  <Button size="sm" disabled={workingId === alert.id} onClick={() => updateAlert(alert, "resolved")}>
                    Resolver
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock3 }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

