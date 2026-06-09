"use client";

import {
  Banknote,
  CreditCard,
  Euro,
  Monitor,
  TrendingUp,
  Truck,
  CalendarDays,
} from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { salesKpis, weeklyTrend } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency, formatDate } from "@/lib/utils";

export function SalesErpPanel() {
  const { t } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.sales.description")} hideTitle />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title={t("pages.sales.today")}
          value={formatCurrency(salesKpis.today)}
          icon={Euro}
          trend="+12,3%"
          trendUp
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t("pages.sales.yesterday")}
          value={formatCurrency(salesKpis.yesterday)}
          icon={CalendarDays}
          iconColor="bg-gray-50 text-gray-600"
        />
        <StatCard
          title={t("pages.sales.month")}
          value={formatCurrency(salesKpis.month)}
          icon={TrendingUp}
          trend="+8,2%"
          trendUp
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t("pages.sales.uberEats")}
          value={formatCurrency(salesKpis.uberEats)}
          icon={Truck}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title={t("pages.sales.glovo")}
          value={formatCurrency(salesKpis.glovo)}
          icon={Truck}
          iconColor="bg-yellow-400 text-gray-900"
        />
        <StatCard
          title={t("pages.sales.restosuite")}
          value={formatCurrency(salesKpis.restosuite)}
          icon={Monitor}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title={t("pages.sales.cash")}
          value={formatCurrency(salesKpis.cash)}
          icon={Banknote}
          iconColor="bg-green-50 text-green-700"
        />
        <StatCard
          title={t("pages.sales.card")}
          value={formatCurrency(salesKpis.card)}
          icon={CreditCard}
          iconColor="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
          {t("pages.sales.trendTitle")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.sales.colDate")}</th>
                <th className="px-4 py-3 text-right">{t("pages.sales.colSales")}</th>
                <th className="px-4 py-3 text-right">{t("pages.sales.colClients")}</th>
                <th className="px-4 py-3 text-right">{t("pages.sales.colDelivery")}</th>
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
