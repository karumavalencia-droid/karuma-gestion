"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { IncidentCategory, IncidentPriority, IncidentStatus } from "@/lib/coach/types";

type Report = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  category: IncidentCategory;
  location: string | null;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  equipment: "Equipo / Avería",
  inventory: "Inventario",
  hygiene: "Higiene",
  customer_complaint: "Queja de cliente",
  safety: "Seguridad",
  other: "Otro",
};

const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_STYLES: Record<IncidentPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  reviewing: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-gray-100 text-gray-500",
};

const FILTERS: { value: IncidentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "reviewing", label: "En revisión" },
  { value: "resolved", label: "Resueltos" },
  { value: "dismissed", label: "Descartados" },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CoachReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (status: IncidentStatus | "all") => {
    setLoading(true);
    try {
      const query = status === "all" ? "" : `?status=${status}`;
      const response = await fetch(`/api/coach/reports${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        reports?: Report[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudieron cargar los reportes.");
      }
      setReports(payload.reports ?? []);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los reportes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function updateStatus(id: string, status: IncidentStatus) {
    if (updatingId) return;
    setUpdatingId(id);
    const previous = reports;
    setReports((current) =>
      current.map((report) => report.id === id ? { ...report, status } : report),
    );
    try {
      const response = await fetch(`/api/coach/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as {
        report?: Pick<Report, "id" | "status" | "reviewed_at" | "reviewed_by">;
        message?: string;
      };
      if (!response.ok || !payload.report) {
        throw new Error(payload.message ?? "No se pudo actualizar el reporte.");
      }
      setReports((current) =>
        current.map((report) =>
          report.id === id ? { ...report, ...payload.report } : report,
        ),
      );
      setError("");
    } catch (updateError) {
      setReports(previous);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el reporte.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes de incidencias"
        description="Incidencias enviadas por el equipo a través de Karuma Coach"
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === option.value
                ? "bg-karuma-600 text-white"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load(filter)}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && reports.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-400">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Cargando reportes…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-sm text-gray-500">
          No hay reportes{filter !== "all" ? " con este estado" : ""}.
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[report.status]}`}
                >
                  {STATUS_LABELS[report.status]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[report.priority]}`}
                >
                  {PRIORITY_LABELS[report.priority]}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {CATEGORY_LABELS[report.category]}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {formatDate(report.created_at)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                {report.description}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                {report.employee_name ?? report.employee_id}
                {report.location ? ` · ${report.location}` : ""}
                {report.reviewed_by
                  ? ` · Revisado por ${report.reviewed_by}`
                  : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {report.status !== "reviewing" && (
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => void updateStatus(report.id, "reviewing")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    En revisión
                  </button>
                )}
                {report.status !== "resolved" && (
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => void updateStatus(report.id, "resolved")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resuelto
                  </button>
                )}
                {report.status !== "dismissed" && (
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => void updateStatus(report.id, "dismissed")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Descartar
                  </button>
                )}
                {report.status !== "pending" && (
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => void updateStatus(report.id, "pending")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reabrir
                  </button>
                )}
                {report.priority === "urgent" && report.status === "pending" && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Urgente sin revisar
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
