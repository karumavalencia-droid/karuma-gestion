"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Users, UserX, TableProperties, Clock, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { StatCard } from "@/components/ui/StatCard";
import { getReservasDashboardStats, type ReservasDashboardStats } from "@/lib/reservas/dashboard-stats";

interface SalesRecord {
  date: string;
  grossSales: number;
  customers: number;
}

interface SalesResponse {
  configured: boolean;
  records: SalesRecord[];
}

function fmt(n: number) {
  return `€${n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const zh = locale === "zh";

  const [stats, setStats] = useState<ReservasDashboardStats | null>(null);
  const [sales, setSales] = useState<SalesResponse | null>(null);

  useEffect(() => {
    getReservasDashboardStats().then(setStats);
    fetch("/api/sales/daily?limit=31")
      .then((r) => r.json())
      .then((d: SalesResponse) => setSales(d))
      .catch(() => null);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const thisMonth = todayStr.slice(0, 7);

  const todayRec = sales?.records.find((r) => r.date === todayStr);
  const yesterdayRec = sales?.records.find((r) => r.date === yesterdayStr);
  const monthTotal = sales?.records
    .filter((r) => r.date.startsWith(thisMonth))
    .reduce((s, r) => s + r.grossSales, 0) ?? 0;
  const todayCustomers = todayRec?.customers ?? null;

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
      value: salesConfigured ? (todayCustomers !== null ? String(todayCustomers) : "0") : "142",
      live: salesConfigured,
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>

      {/* Ventas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {salesCards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{item.label}</p>
              {item.live && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> live
                </span>
              )}
            </div>
            <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Reservas de hoy */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {zh ? "今日预约" : "Reservas hoy"}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            title={zh ? "今日预约数" : "Reservas hoy"}
            value={stats ? String(stats.reservasHoy) : "—"}
            icon={CalendarCheck}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title={zh ? "预约客人数" : "Clientes reservados"}
            value={stats ? String(stats.clientesReservados) : "—"}
            icon={Users}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title={zh ? "今日散客" : "Walk-ins hoy"}
            value={stats ? String(stats.walkIns) : "—"}
            icon={Users}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            title={zh ? "未到店" : "No Shows"}
            value={stats ? String(stats.noShows) : "—"}
            icon={UserX}
            iconColor="bg-red-50 text-red-600"
          />
          <StatCard
            title={zh ? "已占台位" : "Mesas ocupadas"}
            value={stats ? `${stats.mesasOcupadas}/${stats.mesasTotal}` : "—"}
            icon={TableProperties}
            iconColor="bg-orange-50 text-orange-600"
          />
          <StatCard
            title={zh ? "下一预约" : "Próxima reserva"}
            value={stats ? stats.proximaHora : "—"}
            subtitle={stats ? stats.proximaNombre : undefined}
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
            {zh ? "销售数据为 mock，配置 RestaurantSuite 后显示真实数据。" : "Ventas en modo mock — configura RestaurantSuite para datos reales."}
          </p>
        )}
      </div>
    </div>
  );
}
