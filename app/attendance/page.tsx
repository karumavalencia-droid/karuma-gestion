"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  LogOut,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import { ErpPageIntro } from "@/components/layout/ErpPageIntro";
import { PageContent } from "@/components/layout/PageContent";
import { StatCard } from "@/components/ui/StatCard";
import type {
  AttendanceAnomaly,
  AttendanceCorrection,
  AttendanceDayReport,
} from "@/lib/attendance/types";
import { madridTimeLabel, minutesToDuration } from "@/lib/attendance/time";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const anomalyStyle: Record<AttendanceAnomaly, string> = {
  late: "bg-amber-100 text-amber-800",
  early: "bg-orange-100 text-orange-800",
  absent: "bg-red-100 text-red-800",
  "missing-out": "bg-purple-100 text-purple-800",
  duplicate: "bg-pink-100 text-pink-800",
  offline: "bg-blue-100 text-blue-800",
  unscheduled: "bg-gray-200 text-gray-700",
};

const labels = {
  es: {
    description: "Fichajes de hoy, horas reales y excepciones comparadas con el horario.",
    scheduled: "Programados",
    present: "Han fichado",
    working: "En turno",
    problems: "Excepciones",
    employee: "Empleado",
    schedule: "Horario",
    firstIn: "Primera entrada",
    lastOut: "Última salida",
    hours: "Horas netas",
    state: "Estado",
    exceptions: "Excepciones",
    notStarted: "Sin empezar",
    active: "En turno",
    finished: "Finalizado",
    empty: "Sin fichajes",
    error: "No se pudo cargar la asistencia.",
    anomaly: {
      late: "Tarde",
      early: "Salida anticipada",
      absent: "Ausente",
      "missing-out": "Falta salida",
      duplicate: "Secuencia inválida",
      offline: "Fichaje offline",
      unscheduled: "Sin turno",
    },
  },
  zh: {
    description: "Fichajes de hoy, horas reales y excepciones comparadas con el horario.",
    scheduled: "Programados",
    present: "Han fichado",
    working: "En turno",
    problems: "Excepciones",
    employee: "Empleado",
    schedule: "Horario",
    firstIn: "Primera entrada",
    lastOut: "Última salida",
    hours: "Horas netas",
    state: "Estado",
    exceptions: "Excepciones",
    notStarted: "Sin empezar",
    active: "En turno",
    finished: "Finalizado",
    empty: "Sin fichajes",
    error: "No se pudo cargar la asistencia.",
    anomaly: {
      late: "Tarde",
      early: "Salida anticipada",
      absent: "Ausente",
      "missing-out": "Falta salida",
      duplicate: "Secuencia inválida",
      offline: "Fichaje offline",
      unscheduled: "Sin turno",
    },
  },
} as const;

function todayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function AttendancePage() {
  const { locale } = useLanguage();
  const text = labels[locale];
  const [date, setDate] = useState(todayDate);
  const [report, setReport] = useState<AttendanceDayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/admin?date=${date}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("attendance unavailable");
      setReport((await response.json()) as AttendanceDayReport);
      const correctionsResponse = await fetch("/api/attendance/corrections/admin?status=pending", {
        cache: "no-store",
      });
      if (correctionsResponse.ok) {
        const payload = (await correctionsResponse.json()) as { requests?: AttendanceCorrection[] };
        setCorrections(payload.requests ?? []);
      }
      setError("");
    } catch {
      setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [date, text.error]);

  const reviewCorrection = async (correction: AttendanceCorrection, status: "approved" | "rejected") => {
    setReviewing(correction.id);
    try {
      const response = await fetch("/api/attendance/corrections/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: correction.id, status }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? text.error);
      }
      setCorrections((current) => current.filter((item) => item.id !== correction.id));
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : text.error);
    } finally {
      setReviewing(null);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const problemRows =
    report?.rows.filter((row) => row.anomalies.length > 0).length ?? 0;

  return (
    <PageContent>
      <ErpPageIntro
        description={text.description}
        actions={
          <>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-[42px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title={text.scheduled}
          value={String(report?.summary.scheduled ?? "—")}
          icon={Clock3}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={text.present}
          value={String(report?.summary.present ?? "—")}
          icon={UserCheck}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={text.working}
          value={String(report?.summary.working ?? "—")}
          icon={LogOut}
          iconColor="bg-violet-50 text-violet-600"
        />
        <StatCard
          title={text.problems}
          value={String(report ? problemRows : "—")}
          subtitle={
            report
              ? `${report.summary.absent} ausentes`
              : undefined
          }
          icon={AlertTriangle}
          iconColor="bg-red-50 text-red-600"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {corrections.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-amber-950">Solicitudes de corrección</h2>
              <p className="text-xs text-amber-800">Revisa el motivo antes de incorporarlas al registro oficial.</p>
            </div>
            <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900">{corrections.length} pendientes</span>
          </div>
          <div className="space-y-2">
            {corrections.map((correction) => (
              <div key={correction.id} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{correction.employeeName} · {correction.type === "in" ? "Entrada" : "Salida"}</p>
                  <p>{new Date(correction.occurredAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {correction.businessDate}</p>
                  <p className="mt-1 text-xs text-gray-500">Motivo: {correction.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={reviewing === correction.id}
                    onClick={() => void reviewCorrection(correction, "rejected")}
                    className="min-h-10 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 disabled:opacity-50"
                  >Rechazar</button>
                  <button
                    type="button"
                    disabled={reviewing === correction.id}
                    onClick={() => void reviewCorrection(correction, "approved")}
                    className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >Aprobar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{text.employee}</th>
                <th className="px-4 py-3">{text.schedule}</th>
                <th className="px-4 py-3">{text.firstIn}</th>
                <th className="px-4 py-3">{text.lastOut}</th>
                <th className="px-4 py-3">{text.hours}</th>
                <th className="px-4 py-3">{text.state}</th>
                <th className="px-4 py-3">{text.exceptions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(report?.rows ?? []).map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900">{row.employeeName}</p>
                    <p className="text-xs text-gray-500">{row.department}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{row.plannedLabel}</td>
                  <td className="px-4 py-3.5 font-mono text-gray-700">
                    {row.firstIn ? madridTimeLabel(row.firstIn) : "—"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-gray-700">
                    {row.lastOut ? madridTimeLabel(row.lastOut) : "—"}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    {minutesToDuration(row.workedMinutes)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.currentState === "working"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.currentState === "finished"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.currentState === "working"
                        ? text.active
                        : row.currentState === "finished"
                          ? text.finished
                          : text.notStarted}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {row.anomalies.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {row.anomalies.map((anomaly) => (
                          <span
                            key={anomaly}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${anomalyStyle[anomaly]}`}
                          >
                            {text.anomaly[anomaly]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && report?.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <UserX className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                    {text.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContent>
  );
}
