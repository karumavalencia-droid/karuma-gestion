"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Crown,
  Euro,
  Package,
  RefreshCw,
  ShoppingBag,
  Star,
  Target,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { loadCeoDashboard, type CeoDashboard, type PrioridadHoy } from "@/lib/ceo/helpers";
import { formatCurrency } from "@/lib/utils";

const urgenciaStyles = {
  alta: "border-red-200 bg-red-50",
  media: "border-amber-200 bg-amber-50",
  baja: "border-gray-200 bg-gray-50",
};

const urgenciaBadge = {
  alta: "bg-red-100 text-red-800",
  media: "bg-amber-100 text-amber-800",
  baja: "bg-gray-200 text-gray-700",
};

function PrioridadCard({ item }: { item: PrioridadHoy }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3.5 sm:p-4 ${
        item.activa ? urgenciaStyles[item.urgencia] : "border-gray-100 bg-white opacity-70"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          item.activa ? "bg-white shadow-sm" : "bg-gray-100"
        }`}
      >
        {item.activa ? (
          <AlertCircle
            className={`h-4 w-4 ${
              item.urgencia === "alta"
                ? "text-red-600"
                : item.urgencia === "media"
                  ? "text-amber-600"
                  : "text-gray-500"
            }`}
          />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">{item.titulo}</p>
          {item.activa && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${urgenciaBadge[item.urgencia]}`}
            >
              {item.urgencia}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-gray-600">{item.descripcion}</p>
      </div>
    </div>
  );
}

const prioridadIconos: Record<string, typeof TrendingUp> = {
  ventas: TrendingUp,
  compras: ShoppingBag,
  stock: Package,
  reviews: Star,
  bebidas: Wine,
};

export function CeoPanel() {
  const [data, setData] = useState<CeoDashboard | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setData(loadCeoDashboard());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  if (!loaded || !data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
        Cargando CEO Dashboard…
      </div>
    );
  }

  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      {/* Cabecera ejecutiva */}
      <div className="rounded-2xl bg-gray-900 px-4 py-5 text-white shadow-lg sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                CEO Dashboard
              </span>
            </div>
            <h1 className="text-xl font-bold sm:text-2xl">Karuma Sushi & Grill</h1>
            <p className="mt-1 capitalize text-sm text-gray-400">{fechaHoy}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1.5 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-xs ${
              data.usandoDatosReales
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {data.usandoDatosReales
              ? `Datos en vivo · ${data.fuentes.join(" · ")}`
              : "Datos de ejemplo"}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-gray-300 sm:text-xs">
            Objetivo {data.objetivo100k.toLocaleString("es-ES")} €
          </span>
        </div>
      </div>

      {/* KPIs principales */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          KPIs principales
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <StatCard
            title="Ventas hoy"
            value={formatCurrency(data.ventasHoy)}
            subtitle={
              data.clientesHoy > 0 ? `${data.clientesHoy} clientes` : "Estimación diaria"
            }
            icon={Euro}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Ventas mes"
            value={formatCurrency(data.ventasMes)}
            subtitle={`${data.progreso100kPct}% del objetivo`}
            icon={TrendingUp}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Objetivo 100K"
            value={`${data.progreso100kPct}%`}
            subtitle={
              data.falta100k > 0
                ? `Faltan ${data.falta100k.toLocaleString("es-ES")} €`
                : "¡Alcanzado!"
            }
            trend={data.falta100k > 0 ? undefined : "Superado"}
            trendUp={data.falta100k <= 0}
            icon={Target}
            iconColor="bg-karuma-50 text-karuma-600"
          />
          <StatCard
            title="Proyección mensual"
            value={formatCurrency(data.proyeccionMensual)}
            subtitle="Al ritmo actual"
            icon={ArrowUpRight}
            iconColor="bg-violet-50 text-violet-600"
          />
          <StatCard
            title="Beneficio estimado"
            value={formatCurrency(data.beneficioEstimado)}
            trend={data.beneficioEstimado >= 0 ? "Positivo" : "Negativo"}
            trendUp={data.beneficioEstimado >= 0}
            icon={Euro}
            iconColor={
              data.beneficioEstimado >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }
          />
          <StatCard
            title="Margen neto"
            value={`${data.margenNetoPct}%`}
            subtitle="Mes en curso"
            icon={TrendingUp}
            iconColor="bg-indigo-50 text-indigo-600"
          />
        </div>
      </section>

      {/* Barra progreso 100K */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Progreso objetivo 100K</span>
          <span className="font-bold text-karuma-600">{data.progreso100kPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-karuma-600 transition-all"
            style={{ width: `${Math.min(100, data.progreso100kPct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {formatCurrency(data.ventasMes)} de {formatCurrency(data.objetivo100k)} · Proyección{" "}
          {formatCurrency(data.proyeccionMensual)}
        </p>
      </div>

      {/* Estado operativo */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Estado operativo
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <StatCard
            title="Clientes mes"
            value={data.clientesMes.toLocaleString("es-ES")}
            icon={Users}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="Ticket medio"
            value={formatCurrency(data.ticketMedio)}
            icon={Euro}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="Google rating"
            value={`${data.googleRating} ★`}
            icon={Star}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="Reviews actuales"
            value={String(data.reviewsActuales)}
            subtitle="Objetivo 1.000"
            icon={Star}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Stock bajo"
            value={String(data.stockBajo)}
            subtitle={data.stockBajo > 0 ? "Revisar inventario" : "Todo correcto"}
            trend={data.stockBajo > 0 ? "Atención" : "OK"}
            trendUp={data.stockBajo === 0}
            icon={Package}
            iconColor={
              data.stockBajo > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }
          />
          <StatCard
            title="Coste personal %"
            value={`${data.costePersonalPct}%`}
            subtitle={`${data.personalMes.toLocaleString("es-ES")} €/mes`}
            icon={Users}
            iconColor="bg-orange-50 text-orange-600"
          />
        </div>
      </section>

      {/* AI Resumen Ejecutivo */}
      <section className="rounded-2xl border border-karuma-200 bg-gradient-to-br from-karuma-50 via-white to-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-karuma-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Resumen Ejecutivo</h2>
            <p className="text-xs text-gray-500">Tu briefing diario</p>
          </div>
        </div>
        <p className="text-base leading-relaxed text-gray-800 sm:text-lg">{data.resumenEjecutivo}</p>
      </section>

      {/* Prioridades de hoy */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Prioridades de hoy
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {data.prioridades.map((p) => {
            const Icon = prioridadIconos[p.id] ?? Target;
            return (
              <div key={p.id} className="relative">
                <div className="absolute left-3 top-4 z-10 hidden sm:block">
                  <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <PrioridadCard item={p} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
