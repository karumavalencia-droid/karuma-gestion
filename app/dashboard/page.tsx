"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Users, UserX, TableProperties, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { StatCard } from "@/components/ui/StatCard";
import { getReservasDashboardStats, type ReservasDashboardStats } from "@/lib/reservas/dashboard-stats";

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const zh = locale === "zh";

  const [stats, setStats] = useState<ReservasDashboardStats | null>(null);

  useEffect(() => {
    getReservasDashboardStats().then(setStats);
  }, []);

  const cards = [
    { label: t("dashboard.todaySales"), value: "€3,240" },
    { label: t("dashboard.yesterdaySales"), value: "€2,890" },
    { label: t("dashboard.monthSales"), value: "€68,500" },
    { label: t("dashboard.todayFootfall"), value: "142" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

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
      </div>
    </div>
  );
}
