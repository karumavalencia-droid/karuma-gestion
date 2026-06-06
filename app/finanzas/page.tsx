import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { finanzasMes, desgloseIngresos, desgloseGastos } from "@/lib/data/finanzas";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Percent, Truck } from "lucide-react";

export default function FinanzasPage() {
  const margen =
    finanzasMes.ingresos > 0
      ? ((finanzasMes.beneficioEstimado / finanzasMes.ingresos) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <PageHeader title="Finanzas" description="Resumen financiero — Junio 2026" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        <StatCard
          title="Ingresos"
          value={formatCurrency(finanzasMes.ingresos)}
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Gastos"
          value={formatCurrency(finanzasMes.gastos)}
          icon={TrendingDown}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Beneficio estimado"
          value={formatCurrency(finanzasMes.beneficioEstimado)}
          subtitle={`Margen ${margen}%`}
          icon={TrendingUp}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="IVA"
          value={formatCurrency(finanzasMes.iva)}
          icon={Percent}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Comisiones delivery"
          value={formatCurrency(finanzasMes.comisionesDelivery)}
          icon={Truck}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card title="Desglose de ingresos">
          <div className="space-y-3">
            {desgloseIngresos.map((item) => (
              <div key={item.concepto}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-700">{item.concepto}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(item.importe)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${item.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Desglose de gastos">
          <div className="space-y-2">
            {desgloseGastos.map((item) => (
              <div
                key={item.concepto}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <span className="text-sm text-gray-700">{item.concepto}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.importe)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
