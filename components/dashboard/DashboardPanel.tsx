"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Euro,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Truck,
  TrendingUp,
  Users,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { alertasImportantes, productosMasVendidos } from "@/lib/data/dashboard";
import { getAlertasInventario } from "@/lib/data/inventario";
import { pedidos, pedidosStats } from "@/lib/data/pedidos";
import { dashboardKpis, weeklyTrend } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { DailySalesSummary } from "@/lib/sales-sync/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function madridDate(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function DashboardPanel() {
  const { t } = useLanguage();
  const [salesSummary, setSalesSummary] = useState<DailySalesSummary | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/sales/daily?limit=62", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: DailySalesSummary | null) => {
        if (active && data) setSalesSummary(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const liveKpis = useMemo(() => {
    const records = salesSummary?.records ?? [];
    const today = madridDate();
    const yesterday = madridDate(-1);
    const monthPrefix = today.slice(0, 7);
    const todayRecord = records.find((record) => record.date === today);
    const yesterdayRecord = records.find((record) => record.date === yesterday);
    const monthRecords = records.filter((record) => record.date.startsWith(monthPrefix));

    return {
      ventasHoy: todayRecord?.netSales ?? dashboardKpis.ventasHoy,
      ventasAyer: yesterdayRecord?.netSales ?? dashboardKpis.ventasAyer,
      ventasMes:
        monthRecords.length > 0
          ? monthRecords.reduce((sum, record) => sum + record.netSales, 0)
          : dashboardKpis.ventasMes,
      clientes: todayRecord?.customers || dashboardKpis.clientes,
      ticketMedio: todayRecord?.averageTicket || dashboardKpis.ticketMedio,
      trend:
        records.length > 0
          ? records.slice(-7).map((record) => ({
              fecha: record.date,
              ventas: record.netSales,
              clientes: record.customers,
              delivery: record.orders,
            }))
          : weeklyTrend,
      hasLiveData: records.length > 0,
    };
  }, [salesSummary]);

  const salesDelta = liveKpis.ventasHoy - liveKpis.ventasAyer;
  const salesDeltaPct =
    liveKpis.ventasAyer > 0 ? (salesDelta / liveKpis.ventasAyer) * 100 : 0;
  const activeOrders = pedidos.filter((pedido) => pedido.estado !== "entregado").slice(0, 5);
  const inventoryAlerts = getAlertasInventario();
  const orderStatusLabels = {
    pendiente: "Pendiente",
    preparando: "Preparando",
    listo: "Listo",
    entregado: "Entregado",
  };

  return (
    <PageContent>
      <PageHeader description={t("dashboard.description")} hideTitle />

      {salesSummary && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm ${
            liveKpis.hasLiveData
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>
            {liveKpis.hasLiveData
              ? `Ventas sincronizadas${salesSummary.updatedAt ? ` · ${new Date(salesSummary.updatedAt).toLocaleString("es-ES")}` : ""}`
              : "Sincronización diaria preparada; falta autorizar el TPV"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.ventasDia")}
          value={formatCurrency(liveKpis.ventasHoy)}
          icon={Euro}
          subtitle={`${formatCurrency(Math.abs(salesDelta))} vs ${t("pages.dashboard.yesterdaySales")}`}
          trend={`${salesDeltaPct >= 0 ? "+" : ""}${salesDeltaPct.toFixed(1)}%`}
          trendUp={salesDeltaPct >= 0}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t("pages.dashboard.yesterdaySales")}
          value={formatCurrency(liveKpis.ventasAyer)}
          icon={CalendarDays}
          iconColor="bg-gray-50 text-gray-600"
        />
        <StatCard
          title={t("dashboard.ventasMes")}
          value={formatCurrency(liveKpis.ventasMes)}
          icon={TrendingUp}
          trend="+8,2%"
          trendUp
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t("dashboard.clientesHoy")}
          value={String(liveKpis.clientes)}
          icon={Users}
          subtitle={t("dashboard.salaDelivery")}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title={t("dashboard.ticketMedio")}
          value={formatCurrency(liveKpis.ticketMedio)}
          icon={Receipt}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title={t("nav.pedidos")}
          value={String(pedidosStats.enCurso + pedidosStats.pendientes)}
          subtitle={`${t("objetivo.total")}: ${pedidosStats.total}`}
          icon={ShoppingBag}
          iconColor="bg-rose-50 text-rose-600"
        />
        <StatCard
          title={t("dashboard.pedidosDelivery")}
          value={String(pedidosStats.delivery)}
          subtitle={t("dashboard.deliveryChannels")}
          icon={Truck}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title={t("ceo.stockBajo")}
          value={String(inventoryAlerts.length)}
          subtitle={inventoryAlerts.length ? t("ceo.attention") : t("ceo.allOk")}
          icon={PackageSearch}
          iconColor={
            inventoryAlerts.length ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{t("ceo.operationalStatus")}</h3>
            <StatusBadge variant={activeOrders.length ? "warning" : "success"}>
              {activeOrders.length
                ? `${activeOrders.length} ${t("nav.pedidos")}`
                : t("ceo.allOk")}
            </StatusBadge>
          </div>
          <div className="divide-y divide-gray-100">
            {activeOrders.map((pedido) => (
              <div key={pedido.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {pedido.id} · {pedido.canal}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {pedido.detalle ?? pedido.hora}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(pedido.total)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {orderStatusLabels[pedido.estado]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">{t("dashboard.alertas")}</h3>
          </div>
          <div className="space-y-3 p-4">
            {alertasImportantes.slice(0, 4).map((alerta) => (
              <div key={alerta.id} className="rounded-lg bg-gray-50 p-3">
                <div className="mb-1">
                  <StatusBadge variant={alerta.prioridad === "alta" ? "danger" : "warning"}>
                    {alerta.tipo}
                  </StatusBadge>
                </div>
                <p className="text-sm text-gray-700">{alerta.mensaje}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900">{t("dashboard.topProducts")}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {productosMasVendidos.slice(0, 5).map((producto, index) => (
              <div key={producto.nombre} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {index + 1}. {producto.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {producto.cantidad} {t("dashboard.units")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatCurrency(producto.ingresos)}
                </p>
              </div>
            ))}
          </div>
        </section>
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
              {liveKpis.trend.map((row) => (
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
