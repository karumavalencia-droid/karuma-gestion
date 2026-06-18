"use client";

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
import { formatCurrency, formatDate } from "@/lib/utils";

export function DashboardPanel() {
  const { locale, t } = useLanguage();
  const salesDelta = dashboardKpis.ventasHoy - dashboardKpis.ventasAyer;
  const salesDeltaPct = (salesDelta / dashboardKpis.ventasAyer) * 100;
  const activeOrders = pedidos.filter((pedido) => pedido.estado !== "entregado").slice(0, 5);
  const inventoryAlerts = getAlertasInventario();
  const orderStatusLabels =
    locale === "zh"
      ? {
          pendiente: "待处理",
          preparando: "制作中",
          listo: "已完成",
          entregado: "已交付",
        }
      : {
          pendiente: "Pendiente",
          preparando: "Preparando",
          listo: "Listo",
          entregado: "Entregado",
        };

  return (
    <PageContent>
      <PageHeader description={t("dashboard.description")} hideTitle />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.ventasDia")}
          value={formatCurrency(dashboardKpis.ventasHoy)}
          icon={Euro}
          subtitle={`${formatCurrency(Math.abs(salesDelta))} vs ${t("pages.dashboard.yesterdaySales")}`}
          trend={`${salesDeltaPct >= 0 ? "+" : ""}${salesDeltaPct.toFixed(1)}%`}
          trendUp={salesDeltaPct >= 0}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t("pages.dashboard.yesterdaySales")}
          value={formatCurrency(dashboardKpis.ventasAyer)}
          icon={CalendarDays}
          iconColor="bg-gray-50 text-gray-600"
        />
        <StatCard
          title={t("dashboard.ventasMes")}
          value={formatCurrency(dashboardKpis.ventasMes)}
          icon={TrendingUp}
          trend="+8,2%"
          trendUp
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t("dashboard.clientesHoy")}
          value={String(dashboardKpis.clientes)}
          icon={Users}
          subtitle={t("dashboard.salaDelivery")}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title={t("dashboard.ticketMedio")}
          value={formatCurrency(dashboardKpis.ticketMedio)}
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
