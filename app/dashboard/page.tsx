"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Receipt, Timer, Users, UserCheck, UserX, TableProperties, Clock, TrendingUp, WifiOff, RefreshCw } from "lucide-react";
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

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const thisMonth = todayStr.slice(0, 7);

  useEffect(() => {
    // Sync online bookings then compute stats
    syncAndLoadReservas(todayStr)
      .then(() => setStats(getDashboardStats(todayStr)))
      .catch(() => setStats(getDashboardStats(todayStr)));

    fetch("/api/sales/daily", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SalesResponse | null) => {
        // Solo aceptar respuestas con forma válida; si la API falla, dejar
        // sales en null para que el panel muestre "—" sin romperse.
        if (d && Array.isArray(d.records)) setSales(d);
      })
      .catch(() => null);

    fetch("/api/facturas", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: FacturasResponse) => setFacturas(d))
      .catch(() => null);

    fetch("/api/attendance/admin", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AttendanceResponse | null) => setAttendance(d))
      .catch(() => null);
  }, [todayStr]);

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
  const monthTotal = salesRecords
    .filter((r) => r.date.startsWith(thisMonth))
    .reduce((s, r) => s + r.grossSales, 0);

  const salesConfigured = sales?.configured === true;

  const salesCards = [
    {
      label: t("dashboard.todaySales"),
      value: salesConfigured ? (todayRec ? fmt(todayRec.grossSales) : "€0") : "—",
      live: salesConfigured,
    },
    {
      label: t("dashboard.yesterdaySales"),
      value: salesConfigured ? (yesterdayRec ? fmt(yesterdayRec.grossSales) : "€0") : "—",
      live: salesConfigured,
    },
    {
      label: t("dashboard.monthSales"),
      value: salesConfigured ? fmt(monthTotal) : "—",
      live: salesConfigured,
    },
    {
      label: t("dashboard.todayFootfall"),
      value: salesConfigured ? String(todayRec?.customers ?? 0) : "—",
      live: salesConfigured,
    },
  ];

  const facturasPendientes = facturas?.configured
    ? (facturas.facturas ?? []).filter((f) => !f.enviadoAt).length
    : null;
  const horasHoy = attendance?.rows
    ? attendance.rows.reduce((s, r) => s + (r.workedMinutes || 0), 0) / 60
    : null;

  function refreshDashboard() {
    setRefreshing(true);
    window.location.reload();
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

      {/* Ventas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {salesCards.map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{item.label}</p>
              {item.live ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <WifiOff className="h-3 w-3" /> mock
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
        {!salesConfigured && (
          <p className="mt-2 text-xs text-gray-400">
            Ventas en modo mock - configura RestaurantSuite para datos reales.
          </p>
        )}
      </div>
    </div>
  );
}
