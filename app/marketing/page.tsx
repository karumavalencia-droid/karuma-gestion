import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { promociones, canalesMarketing, redesSociales } from "@/lib/data/marketing";
import { Promocion } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Megaphone, Instagram, TrendingUp } from "lucide-react";

const promoEstado = {
  activa: { variant: "success" as const, label: "Activa" },
  programada: { variant: "info" as const, label: "Programada" },
  finalizada: { variant: "neutral" as const, label: "Finalizada" },
};

export default function MarketingPage() {
  const inversionTotal = canalesMarketing.reduce((s, c) => s + c.inversion, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Promociones, publicidad y redes sociales" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Promociones activas"
          value={String(promociones.filter((p) => p.estado === "activa").length)}
          icon={Megaphone}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Inversión publicitaria"
          value={formatCurrency(inversionTotal)}
          subtitle="Este mes"
          icon={TrendingUp}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Seguidores totales"
          value={String(
            redesSociales.instagram.seguidores +
              redesSociales.facebook.seguidores +
              redesSociales.tiktok.seguidores
          )}
          icon={Instagram}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Promociones</h2>
        <DataTable<Promocion>
          data={promociones}
          keyExtractor={(p) => p.id}
          mobileLabel={(p) => p.nombre}
          columns={[
            { key: "nombre", header: "Promoción" },
            { key: "descuento", header: "Detalle" },
            { key: "vigencia", header: "Vigencia" },
            {
              key: "estado",
              header: "Estado",
              render: (p) => (
                <StatusBadge variant={promoEstado[p.estado].variant}>
                  {promoEstado[p.estado].label}
                </StatusBadge>
              ),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Canales publicitarios</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {canalesMarketing.map((canal) => (
            <Card key={canal.canal}>
              <p className="font-semibold text-gray-900">{canal.canal}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Inversión</p>
                  <p className="text-sm font-bold">{formatCurrency(canal.inversion)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversiones</p>
                  <p className="text-sm font-bold">{canal.conversiones}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ROI</p>
                  <p className="text-sm font-bold text-emerald-600">{canal.roi}x</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Redes sociales</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ["Instagram", redesSociales.instagram],
              ["Facebook", redesSociales.facebook],
              ["TikTok", redesSociales.tiktok],
            ] as const
          ).map(([nombre, datos]) => (
            <Card key={nombre}>
              <p className="font-semibold text-gray-900">{nombre}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Seguidores</dt>
                  <dd className="font-medium">{datos.seguidores.toLocaleString("es-ES")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Engagement</dt>
                  <dd className="font-medium">{datos.engagement}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Publicaciones/mes</dt>
                  <dd className="font-medium">{datos.publicacionesMes}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
