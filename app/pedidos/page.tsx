import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { pedidos, pedidosStats } from "@/lib/data/pedidos";
import { Pedido, CanalPedido, EstadoPedido } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ClipboardList, Clock, CheckCircle, Truck } from "lucide-react";

const canalVariant: Record<CanalPedido, "neutral" | "info" | "warning" | "purple" | "success"> = {
  Mesa: "info",
  "Uber Eats": "neutral",
  Glovo: "warning",
  "Just Eat": "purple",
  Teléfono: "success",
};

const estadoConfig: Record<
  EstadoPedido,
  { variant: "warning" | "info" | "success" | "neutral"; label: string }
> = {
  pendiente: { variant: "warning", label: "Pendiente" },
  preparando: { variant: "info", label: "Preparando" },
  listo: { variant: "success", label: "Listo" },
  entregado: { variant: "neutral", label: "Entregado" },
};

export default function PedidosPage() {
  return (
    <div>
      <PageHeader title="Pedidos" description="Pedidos en tiempo real — sala y delivery" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4 sm:gap-4">
        <StatCard
          title="Total hoy"
          value={String(pedidosStats.total)}
          icon={ClipboardList}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Pendientes"
          value={String(pedidosStats.pendientes)}
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="En curso"
          value={String(pedidosStats.enCurso)}
          icon={Truck}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Entregados"
          value={String(pedidosStats.entregados)}
          icon={CheckCircle}
          iconColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      <DataTable<Pedido>
        data={pedidos}
        keyExtractor={(p) => p.id}
        mobileLabel={(p) => `${p.id} · ${p.canal}`}
        columns={[
          { key: "id", header: "Nº" },
          {
            key: "canal",
            header: "Canal",
            render: (p) => <StatusBadge variant={canalVariant[p.canal]}>{p.canal}</StatusBadge>,
          },
          {
            key: "estado",
            header: "Estado",
            render: (p) => (
              <StatusBadge variant={estadoConfig[p.estado].variant}>
                {estadoConfig[p.estado].label}
              </StatusBadge>
            ),
          },
          {
            key: "total",
            header: "Total",
            render: (p) => <span className="font-semibold">{formatCurrency(p.total)}</span>,
          },
          { key: "hora", header: "Hora" },
        ]}
      />
    </div>
  );
}
