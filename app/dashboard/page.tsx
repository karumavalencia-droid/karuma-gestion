"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, Receipt, Timer, Users, UserCheck, UserX, TableProperties, Clock, TrendingUp, WifiOff, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboardStats, type StatsLocal } from "@/lib/reservas/local-store";
import { syncAndLoadReservas } from "@/lib/reservas/sync";

interface SalesRecord { date: string; grossSales: number; customers: number; }
interface SalesResponse { configured: boolean; records: SalesRecord[]; }

interface FacturasResponse {
  configured?: boolean;
  facturas?: { enviadoAt?: number }[];
}

interface AttendanceResponse {
  summary?: { scheduled: number; present: number; working: number };
  rows?: { workedMinutes: number }[];
}

function fmt(n: number) {
  return `€${n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const [stats, setStats] = useState<StatsLocal | null>(null);
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [facturas, setFacturas] = useState<FacturasResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  // Fechas en horario de Madrid, coherentes con business_date en sales_daily
  // (la API guarda el día de calendario en Europe/Madrid, no en UTC).
  const madridDate = (offsetDays = 0) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };
  const todayStr = madridDate(0);
  const yesterdayStr = madridDate(-1);
  const thisMonth = todayStr.slice(0, 7);

  const loadDashboard = useCallback(async () => {
    setDataWarnings([]);
    const warnings: string[] = [];
    await Promise.all([
      syncAndLoadReservas(todayStr)
        .then(() => setStats(getDashboardStats(todayStr)))
        .catch(() => {
          setStats(getDashboardStats(todayStr));
          warnings.push("reservas");
        }),
      fetch("/api/sales/daily", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: SalesResponse | null) => {
          if (d && Array.isArray(d.records)) setSales(d);
          else warnings.push("ventas");
        })
        .catch(() => warnings.push("ventas")),
      fetch("/api/facturas", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((d: FacturasResponse) => setFacturas(d))
        .catch(() => warnings.push("facturas")),
      fetch("/api/attendance/admin", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: AttendanceResponse | null) => {
          if (d) setAttendance(d);
          else warnings.push("personal");
        })
        .catch(() => warnings.push("personal")),
    ]);
    setDataWarnings([...new Set(warnings)]);
  }, [todayStr]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      syncAndLoadReservas(todayStr)
        .then(() => setStats(getDashboardStats(todayStr)))
        .catch(() => setStats(getDashboardStats(todayStr)));
    }, 30_000);
    return () => clearInterval(id);
  }, [todayStr]);

  const salesRecords = sales?.records ?? [];
  const todayRec = salesRecords.find((r) => r.date === todayStr);
  const yesterdayRec = salesRecords.find((r) => r.date === yesterdayStr);
  const monthRecords = salesRecords.filter((r) => r.date.startsWith(thisMonth));
  const monthTotal = monthRecords.reduce((s, r) => s + r.grossSales, 0);

  // "configurado" = la BD de ventas existe. NO implica que haya datos reales.
  const salesConfigured = sales?.configured === true;

  // Estado por tarjeta:
  //  live   → hay un registro real para ese periodo (única condición para "live")
  //  nodata → la BD existe pero no hay registro para ese periodo → "Sin datos"
  //  off    → la BD de ventas no está configurada → "—"
  type SalesCardState = "live" | "nodata" | "off";
  const mkCard = (
    label: string,
    hasRecord: boolean,
    value: string,
  ): { label: string; value: string; state: SalesCardState } => {
    if (!salesConfigured) return { label, value: "—", state: "off" };
    if (!hasRecord) return { label, value: "Sin datos", state: "nodata" };
    return { label, value, state: "live" };
  };

  const salesCards = [
    mkCard(t("dashboard.todaySales"), Boolean(todayRec), fmt(todayRec?.grossSales ?? 0)),
    mkCard(
      t("dashboard.yesterdaySales"),
      Boolean(yesterdayRec),
      fmt(yesterdayRec?.grossSales ?? 0),
    ),
    mkCard(t("dashboard.monthSales"), monthRecords.length > 0, fmt(monthTotal)),
    mkCard(
      t("dashboard.todayFootfall"),
      Boolean(todayRec),
      String(todayRec?.customers ?? 0),
    ),
  ];

  const facturasPendientes = facturas?.configured
    ? (facturas.facturas ?? []).filter((f) => !f.enviadoAt).length
    : null;
  const horasHoy = attendance?.rows
    ? attendance.rows.reduce((s, r) => s + (r.workedMinutes || 0), 0) / 60
    : null;

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>
        <button
          type="button"
          onClick={refreshDashboard}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-karuma-300 hover:text-karuma-700 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando…" : "Actualizar datos"}
        </button>
      </div>

      {dataWarnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Algunas fuentes no respondieron. Los datos disponibles siguen visibles; pulsa Actualizar datos para reintentar.
          </p>
        </div>
      )}

      {/* Ventas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {salesCards.map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{item.label}</p>
              {item.state === "live" ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> live
                </span>
              ) : item.state === "nodata" ? (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  sin datos
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <WifiOff className="h-3 w-3" /> sin conexión
                </span>
              )}
            </div>
            <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Operativa de hoy: facturas pendientes + equipo en turno */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Operativa hoy</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Link href="/facturas" className="block">
            <StatCard
              title="Facturas por enviar"
              value={facturasPendientes !== null ? String(facturasPendientes) : "—"}
              subtitle={facturasPendientes !== null ? "a la asesoría" : "nube no configurada"}
              icon={Receipt}
              iconColor="bg-amber-50 text-amber-600"
            />
          </Link>
          <Link href="/attendance" className="block">
            <StatCard
              title="Fichados ahora"
              value={
                attendance?.summary
                  ? `${attendance.summary.working}/${attendance.summary.scheduled}`
                  : "—"
              }
              subtitle="en turno / planificados"
              icon={UserCheck}
              iconColor="bg-emerald-50 text-emerald-600"
            />
          </Link>
          <Link href="/attendance" className="block">
            <StatCard
              title="Horas trabajadas hoy"
              value={horasHoy !== null ? `${horasHoy.toFixed(1)} h` : "—"}
              subtitle="todo el equipo"
              icon={Timer}
              iconColor="bg-blue-50 text-blue-600"
            />
          </Link>
        </div>
      </div>

      {/* Reservas de hoy - live desde localStorage */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Reservas hoy
          </h2>
          {stats !== null && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            title="Reservas hoy"
            value={stats !== null ? String(stats.reservasHoy) : "—"}
            icon={CalendarCheck}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Pax reservados"
            value={stats !== null ? String(stats.paxHoy) : "—"}
            icon={Users}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Walk-ins hoy"
            value={stats !== null ? String(stats.walkInsHoy) : "—"}
            icon={Users}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="No Shows"
            value={stats !== null ? String(stats.noShowsHoy) : "—"}
            icon={UserX}
            iconColor="bg-red-50 text-red-600"
          />
          <StatCard
            title="Mesas ocupadas"
            value={stats !== null ? `${stats.mesasOcupadas}/${stats.mesasTotal}` : "—"}
            icon={TableProperties}
            iconColor="bg-orange-50 text-orange-600"
          />
          <StatCard
            title="Próxima reserva"
            value={stats !== null ? stats.proximaHora : "—"}
            subtitle={stats?.proximaNombre}
            icon={Clock}
            iconColor="bg-yellow-50 text-yellow-600"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-gray-900">{t("dashboard.systemStatus")}</h2>
        <p className="mt-2 text-sm text-gray-600">{t("dashboard.systemNote")}</p>
        {!salesConfigured ? (
          <p className="mt-2 text-xs text-gray-400">
            Base de datos de ventas no configurada.
          </p>
        ) : salesRecords.length === 0 ? (
          <p className="mt-2 text-xs text-amber-600">
            Todavía no hay ventas importadas. Sube el CSV del TPV (Restosuite / Palmier
            Pro) en el módulo Datos. No hay sincronización automática con el TPV.
          </p>
        ) : null}
      </div>
    </div>
  );
}
