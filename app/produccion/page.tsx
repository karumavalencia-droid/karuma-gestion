import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { produccion } from "@/lib/data/produccion";
import { formatPercent } from "@/lib/utils";
import { ChefHat } from "lucide-react";

export default function ProduccionPage() {
  return (
    <div>
      <PageHeader
        title="Producción"
        description="Estado de preparación en cocina — actualizado hoy"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {produccion.map((item) => {
          const porcentaje = formatPercent(item.cantidad, item.objetivo);
          const colorBarra =
            porcentaje >= 80
              ? "bg-emerald-500"
              : porcentaje >= 50
                ? "bg-amber-500"
                : "bg-red-500";

          return (
            <Card key={item.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-karuma-50 p-2.5 text-karuma-600">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
                    <p className="text-xs text-gray-500">
                      Actualizado a las {item.ultimaActualizacion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {item.cantidad}{" "}
                    <span className="text-sm font-normal text-gray-500">{item.unidad}</span>
                  </span>
                  <span className="text-sm text-gray-500">
                    Objetivo: {item.objetivo} {item.unidad}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-gray-500">Progreso</span>
                    <span className="font-medium text-gray-700">{porcentaje}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${colorBarra}`}
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
