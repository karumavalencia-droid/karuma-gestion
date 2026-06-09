"use client";

import {
  Euro,
  Users,
  Receipt,
  TrendingUp,
  Truck,
  Monitor,
  CalendarDays,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { dashboardKpis, weeklyTrend } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency, formatDate } from "@/lib/utils";

export function DashboardPanel() {
  const { t } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.dashboard.description")} hideTitle />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title={t("pages.dashboard.todaySales")}
          value={formatCurrency(dashboardKpis.ventasHoy)}
          icon={Euro}
          trend="+12,3%"
          trendUp
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t("pages.dashboard.yesterdaySales")}
          value={formatCurrency(dashboardKpis.ventasAyer)}
          icon={CalendarDays}
          iconColor="bg-gray-50 text-gray-600"
        />
        <StatCard
          title={t("pages.dashboard.monthSales")}
          value={formatCurrency(dashboardKpis.ventasMes)}
          icon={TrendingUp}
          trend="+8,2%"
          trendUp
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t("pages.dashboard.footfall")}
          value={String(dashboardKpis.clientes)}
          icon={Users}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title={t("pages.dashboard.avgSpend")}
          value={formatCurrency(dashboardKpis.ticketMedio)}
          icon={Receipt}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title={t("pages.dashboard.uberEats")}
          value={formatCurrency(dashboardKpis.uberEats)}
          icon={Truck}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title={t("pages.dashboard.glovo")}
          value={formatCurrency(dashboardKpis.glovo)}
          icon={Truck}
          iconColor="bg-yellow-400 text-gray-900"
        />
        <StatCard
          title={t("pages.dashboard.restosuite")}
          value={dashboardKpis.restosuite.toLocaleString()}
          subtitle={t("pages.dashboard.restosuiteUnit")}
          icon={Monitor}
          iconColor="bg-karuma-50 text-karuma-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
          {t("pages.dashboard.weeklyTrend")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.dashboard.colDate")}</th>
                <th className="px-4 py-3 text-right">{t("pages.dashboard.colSales")}</th>
                <th className="px-4 py-3 text-right">{t("pages.dashboard.colClients")}</th>
                <th className="px-4 py-3 text-right">{t("pages.dashboard.colDelivery")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {weeklyTrend.map((row) => (
                <tr key={row.fecha} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 text-gray-700">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(row.ventas)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.clientes}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.delivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContent>
  );
}
