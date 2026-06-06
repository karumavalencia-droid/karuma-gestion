import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { recetas, fichasCoste, equiposCocina } from "@/lib/data/cocina";
import { Receta, FichaCoste } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ChefHat, Flame, Fish } from "lucide-react";

const categoriaVariant = {
  Rational: "danger" as const,
  Pira: "warning" as const,
  Sushi: "info" as const,
  Otros: "neutral" as const,
};

export default function CocinaPage() {
  const recetasRational = recetas.filter((r) => r.categoria === "Rational");
  const recetasPira = recetas.filter((r) => r.categoria === "Pira");
  const recetasSushi = recetas.filter((r) => r.categoria === "Sushi");

  return (
    <div className="space-y-6">
      <PageHeader title="Cocina" description="Recetas, equipos y fichas de coste" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Rational</p>
              <p className="text-xs text-gray-500">{equiposCocina.rational.modelo}</p>
              <StatusBadge variant="success">{equiposCocina.rational.estado}</StatusBadge>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Pira</p>
              <p className="text-xs text-gray-500">{equiposCocina.pira.modelo}</p>
              <StatusBadge variant="success">{equiposCocina.pira.estado}</StatusBadge>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Fish className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Sushi</p>
              <p className="text-xs text-gray-500">{recetasSushi.length} recetas activas</p>
              <StatusBadge variant="info">Estación activa</StatusBadge>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
          <ChefHat className="h-5 w-5" />
          Recetas
        </h2>
        <DataTable<Receta>
          data={recetas}
          keyExtractor={(r) => r.id}
          mobileLabel={(r) => r.nombre}
          columns={[
            { key: "nombre", header: "Receta" },
            {
              key: "categoria",
              header: "Estación",
              render: (r) => (
                <StatusBadge variant={categoriaVariant[r.categoria]}>{r.categoria}</StatusBadge>
              ),
            },
            { key: "porciones", header: "Porciones" },
            {
              key: "costePorcion",
              header: "Coste/porción",
              render: (r) => formatCurrency(r.costePorcion),
            },
            {
              key: "tiempoMin",
              header: "Tiempo",
              render: (r) => `${r.tiempoMin} min`,
            },
          ]}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Rational · {recetasRational.length} recetas</h2>
          <div className="space-y-2">
            {recetasRational.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p className="font-medium text-gray-900">{r.nombre}</p>
                <p className="text-xs text-gray-500">
                  {r.porciones} porc. · {r.tiempoMin} min · {formatCurrency(r.costePorcion)}/porc.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Pira · {recetasPira.length} recetas</h2>
          <div className="space-y-2">
            {recetasPira.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p className="font-medium text-gray-900">{r.nombre}</p>
                <p className="text-xs text-gray-500">
                  {r.porciones} porc. · {r.tiempoMin} min · {formatCurrency(r.costePorcion)}/porc.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Fichas de coste</h2>
        <DataTable<FichaCoste>
          data={fichasCoste}
          keyExtractor={(f) => f.id}
          mobileLabel={(f) => f.plato}
          columns={[
            { key: "plato", header: "Plato" },
            {
              key: "costeTotal",
              header: "Coste total",
              render: (f) => formatCurrency(f.costeTotal),
            },
            {
              key: "pvp",
              header: "PVP",
              render: (f) => formatCurrency(f.pvp),
            },
            {
              key: "margen",
              header: "Margen",
              render: (f) => (
                <span className="font-semibold text-emerald-600">{f.margen}%</span>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
