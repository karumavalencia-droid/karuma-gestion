import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { pedidosDelivery, deliveryStats } from "@/lib/data/delivery";
import { PedidoDelivery } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Truck, ShoppingBag, Receipt } from "lucide-react";

const estadoConfig = {
  entregado: { variant: "success" as const, label: "Entregado" },
  "en camino": { variant: "info" as const, label: "En camino" },
  preparando: { variant: "warning" as const, label: "Preparando" },
};

export default function DeliveryPage() {
  return (
    <div>
      <PageHeader
        title="Delivery"
        description="Pedidos a domicilio — Uber Eats y Glovo"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Uber Eats">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Pedidos</p>
              <p className="text-xl font-bold text-gray-900">{deliveryStats.uberEats.pedidos}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ventas</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(deliveryStats.uberEats.ventas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ticket medio</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(deliveryStats.uberEats.ticketMedio)}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Glovo">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Pedidos</p>
              <p className="text-xl font-bold text-gray-900">{deliveryStats.glovo.pedidos}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ventas</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(deliveryStats.glovo.ventas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ticket medio</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(deliveryStats.glovo.ticketMedio)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total pedidos"
          value={String(deliveryStats.total.pedidos)}
          icon={ShoppingBag}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title="Total ventas"
          value={formatCurrency(deliveryStats.total.ventas)}
          icon={Truck}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Ticket medio"
          value={formatCurrency(deliveryStats.total.ticketMedio)}
          icon={Receipt}
          iconColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      <h2 className="mb-3 text-base font-semibold text-gray-900">Pedidos de hoy</h2>
      <DataTable<PedidoDelivery>
        data={pedidosDelivery}
        keyExtractor={(p) => p.id}
        columns={[
          { key: "id", header: "Nº Pedido" },
          {
            key: "plataforma",
            header: "Plataforma",
            render: (p) => (
              <Badge variant={p.plataforma === "Uber Eats" ? "neutral" : "warning"}>
                {p.plataforma}
              </Badge>
            ),
          },
          { key: "hora", header: "Hora" },
          {
            key: "importe",
            header: "Importe",
            render: (p) => (
              <span className="font-medium">{formatCurrency(p.importe)}</span>
            ),
          },
          {
            key: "estado",
            header: "Estado",
            render: (p) => (
              <Badge variant={estadoConfig[p.estado].variant}>
                {estadoConfig[p.estado].label}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
