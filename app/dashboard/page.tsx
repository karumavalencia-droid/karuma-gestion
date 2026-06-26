"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Users, UserX, TableProperties, Clock, TrendingUp, WifiOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboardStats, type StatsLocal } from "@/lib/reservas/local-store";
import { syncAndLoadReservas } from "@/lib/reservas/sync";

interface SalesRecord { date: string; grossSales: number; customers: number; }
interface SalesResponse { configured: boolean; records: SalesRecord[]; }

function fmt(n: number) {
  return `€${n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const [stats, setStats] = useState<StatsLocal | null>(null);
  const [sales, setSales] = useState<SalesResponse | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const thisMonth = todayStr.slice(0, 7);

  useEffect(() => {
    // Sync online bookings then compute stats
    syncAndLoadReservas(todayStr)
      .then(() => setStats(getDashboardStats(todayStr)))
      .catch(() => setStats(getDashboardStats(todayStr)));

    fetch("/api/sales/daily?limit=31")
      .then((r) => r.json())
      .then((d: SalesResponse) => setSales(d))
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

  const todayRec = sales?.records.find((r) => r.date === todayStr);
  const yesterdayRec = sales?.records.find((r) => r.date === yesterdayStr);
  const monthTotal = sales?.records
    .filter((r) => r.date.startsWith(thisMonth))
    .reduce((s, r) => s + r.grossSales, 0) ?? 0;

  const salesConfigured = sales?.configured === true;

  const salesCards = [
    {
      label: t("dashboard.todaySales"),
      value: salesConfigured ? (todayRec ? fmt(todayRec.grossSales) : "€0") : "€3,240",
      live: salesConfigured,
    },
    {
      label: t("dashboard.yesterdaySales"),
      value: salesConfigured ? (yesterdayRec ? fmt(yesterdayRec.grossSales) : "€0") : "€2,890",
      live: salesConfigured,
    },
    {
      label: t("dashboard.monthSales"),
      value: salesConfigured ? fmt(monthTotal) : "€68,500",
      live: salesConfigured,
    },
    {
      label: t("dashboard.todayFootfall"),
      value: salesConfigured ? String(todayRec?.customers ?? 0) : "142",
      live: salesConfigured,
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>

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
