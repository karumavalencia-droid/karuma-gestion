import { Euro, Users, Receipt, TrendingUp, Truck, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { dashboardStats, productosMasVendidos, alertasImportantes } from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen del día — Karuma Sushi & Grill, Valencia"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Ventas del día"
          value={formatCurrency(dashboardStats.ventasHoy)}
          icon={Euro}
          trend="+12,4% vs ayer"
          trendUp
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(dashboardStats.ventasMes)}
          icon={TrendingUp}
          trend="+8,2% vs mes anterior"
          trendUp
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Clientes hoy"
          value={String(dashboardStats.clientesHoy)}
          subtitle="Sala + delivery"
          icon={Users}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Ticket medio"
          value={formatCurrency(dashboardStats.ticketMedio)}
          icon={Receipt}
          trend="+2,1%"
          trendUp
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Pedidos delivery"
          value={String(dashboardStats.pedidosDelivery)}
          subtitle="Uber Eats + Glovo + Just Eat"
          icon={Truck}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Uber Eats"
          value={formatCurrency(dashboardStats.uberEats.ventas)}
          subtitle={`${dashboardStats.uberEats.pedidos} pedidos`}
          icon={Truck}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title="Glovo"
          value={formatCurrency(dashboardStats.glovo.ventas)}
          subtitle={`${dashboardStats.glovo.pedidos} pedidos`}
          icon={Truck}
          iconColor="bg-yellow-400 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card title="Productos más vendidos">
          <div className="space-y-2 sm:space-y-3">
            {productosMasVendidos.map((producto, index) => (
              <div
                key={producto.nombre}
                className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-karuma-100 text-[10px] font-bold text-karuma-700 sm:h-7 sm:w-7 sm:text-xs">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{producto.nombre}</p>
                    <p className="text-xs text-gray-500">{producto.cantidad} uds.</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatCurrency(producto.ingresos)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alertas importantes">
          <div className="space-y-2 sm:space-y-3">
            {alertasImportantes.map((alerta) => (
              <div
                key={alerta.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${
                      alerta.prioridad === "alta" ? "text-red-500" : "text-amber-500"
                    }`}
                  />
                  <p className="text-sm text-gray-900">{alerta.mensaje}</p>
                </div>
                <StatusBadge variant={alerta.prioridad === "alta" ? "danger" : "warning"}>
                  {alerta.prioridad === "alta" ? "Alta" : "Media"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
