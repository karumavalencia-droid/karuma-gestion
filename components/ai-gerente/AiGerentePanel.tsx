"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Euro,
  Lightbulb,
  PieChart,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { loadGerenteContext, type GerenteContext } from "@/lib/ai-gerente/context";
import {
  buildAlertasLive,
  buildKpisLive,
  buildRecomendacionesLive,
  buildResumenLive,
  getRespuestaGerenteLive,
  preguntasRapidasLive,
} from "@/lib/ai-gerente/live";
import { formatCurrency } from "@/lib/utils";

interface MensajeChat {
  id: string;
  rol: "usuario" | "gerente";
  texto: string;
}

const alertaIcono = {
  stock_bajo: AlertTriangle,
  producto_critico: ShieldAlert,
  gasto_alto: Euro,
  personal_insuficiente: Users,
  delivery_bajo: TrendingUp,
  reputacion: Star,
  beneficio: PieChart,
};

const alertaVariant = {
  alta: "danger" as const,
  media: "warning" as const,
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

export function AiGerentePanel() {
  const [ctx, setCtx] = useState<GerenteContext | null>(null);
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [pensando, setPensando] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadGerenteContext();
    setCtx(loaded);
    setMensajes([
      {
        id: "bienvenida",
        rol: "gerente",
        texto: loaded.hasLiveData
          ? `Conectado a ${loaded.fuentes.join(" + ")}. Puedo cruzar ventas Restosuite, beneficio Profit y reputación Google Reviews. ¿En qué te ayudo?`
          : "Buenas. Soy tu gerente IA. Conecta Reviews, Restosuite y Profit para análisis en vivo. Mientras tanto, puedo responder con datos limitados.",
      },
    ]);
  }, []);

  const resumen = useMemo(() => (ctx ? buildResumenLive(ctx) : null), [ctx]);
  const kpis = useMemo(() => (ctx ? buildKpisLive(ctx) : null), [ctx]);
  const alertas = useMemo(() => (ctx ? buildAlertasLive(ctx) : []), [ctx]);
  const recomendaciones = useMemo(() => (ctx ? buildRecomendacionesLive(ctx) : []), [ctx]);

  const enviarPregunta = (texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed || pensando || !ctx) return;

    const idUsuario = `u-${Date.now()}`;
    setMensajes((prev) => [...prev, { id: idUsuario, rol: "usuario", texto: trimmed }]);
    setPregunta("");
    setPensando(true);

    window.setTimeout(() => {
      setMensajes((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          rol: "gerente",
          texto: getRespuestaGerenteLive(ctx, trimmed),
        },
      ]);
      setPensando(false);
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }, 700);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    enviarPregunta(pregunta);
  };

  if (!ctx || !resumen || !kpis) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Cargando AI Gerente…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Gerente"
        description="Análisis cruzado — Google Reviews + Restosuite + Profit"
      >
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            resumen.esLive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-karuma-50 text-karuma-700"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          {resumen.esLive ? resumen.fuentes.join(" · ") : "Sin datos en vivo"}
        </div>
      </PageHeader>

      <section className="mb-4 sm:mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Panel ejecutivo
        </h2>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          <StatCard
            title="Ventas hoy"
            value={formatCurrency(kpis.ventasHoy)}
            subtitle={
              kpis.clientesHoy > 0
                ? `${kpis.clientesHoy} clientes`
                : ctx.restosuite?.ventasHoy
                  ? "Restosuite"
                  : "Media diaria estimada"
            }
            icon={Euro}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Beneficio estimado"
            value={formatCurrency(kpis.beneficioEstimado)}
            subtitle={`Margen ${kpis.margenPct}% · mes actual`}
            trend={kpis.beneficioEstimado >= 0 ? "Positivo" : "Negativo"}
            trendUp={kpis.beneficioEstimado >= 0}
            icon={PieChart}
            iconColor={
              kpis.beneficioEstimado >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }
          />
          <StatCard
            title="Objetivo 100K"
            value={`${kpis.progreso100kPct}%`}
            subtitle={
              kpis.falta100k > 0
                ? `Faltan ${kpis.falta100k.toLocaleString("es-ES")} €`
                : "Objetivo alcanzado"
            }
            trend={`${kpis.ventasMes.toLocaleString("es-ES")} € / 100.000 €`}
            trendUp={kpis.progreso100kPct >= 70}
            icon={Target}
            iconColor="bg-karuma-50 text-karuma-600"
          />
          <StatCard
            title="Google Rating"
            value={kpis.googleRating !== null ? `${kpis.googleRating} ★` : "—"}
            subtitle={
              kpis.totalResenas !== null
                ? `${kpis.totalResenas} reseñas`
                : "Sin datos Reviews"
            }
            icon={Star}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="Clientes necesarios"
            value={kpis.clientesNecesarios > 0 ? String(kpis.clientesNecesarios) : "0"}
            subtitle={
              kpis.falta100k > 0
                ? `Para 100K · ticket ${formatCurrency(kpis.ticketMedio)}`
                : "Meta 100K cubierta"
            }
            icon={Users}
            iconColor="bg-blue-50 text-blue-600"
          />
          <div className="rounded-xl border border-karuma-200 bg-gradient-to-br from-karuma-50 to-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 sm:text-sm">Recomendación IA</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 line-clamp-3">
                  {kpis.recomendacionIA}
                </p>
                <p
                  className={`mt-2 text-xs font-medium ${
                    kpis.recomendacionImpacto === "alto" ? "text-karuma-700" : "text-gray-600"
                  }`}
                >
                  Impacto {kpis.recomendacionImpacto} · AI Gerente
                </p>
              </div>
              <div className="shrink-0 rounded-lg bg-karuma-100 p-2.5 text-karuma-700 sm:p-3">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        </div>
        <p className="rounded-xl border border-karuma-100 bg-karuma-50/50 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {resumen.resumenTexto}
        </p>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-2 lg:gap-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Alertas inteligentes
          </h2>
          <Card>
            <div className="space-y-3">
              {alertas.map((alerta) => {
                const Icon = alertaIcono[alerta.tipo] ?? AlertTriangle;
                return (
                  <div
                    key={alerta.id}
                    className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 sm:px-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-karuma-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{alerta.titulo}</p>
                        <StatusBadge variant={alertaVariant[alerta.prioridad]}>
                          {alerta.prioridad === "alta" ? "Alta" : "Media"}
                        </StatusBadge>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">{alerta.mensaje}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recomendaciones
          </h2>
          <Card>
            <div className="space-y-3">
              {recomendaciones.map((rec, index) => (
                <div
                  key={rec.id}
                  className="flex gap-3 rounded-lg border border-gray-100 px-3 py-3 sm:px-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-gray-800">{rec.texto}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Impacto {rec.impacto === "alto" ? "alto" : "medio"} · {rec.fuente} · #
                      {index + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Pregunta al gerente IA
        </h2>
        <Card className="overflow-hidden">
          <div
            ref={chatRef}
            className="mb-4 max-h-72 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-3 sm:max-h-80 sm:p-4"
          >
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.rol === "usuario" ? "flex-row-reverse" : ""}`}
              >
                {msg.rol === "gerente" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-karuma-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
                    msg.rol === "usuario"
                      ? "bg-karuma-600 text-white"
                      : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            ))}
            {pensando && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-karuma-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-500">
                  Cruzando Reviews, Restosuite y Profit…
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {preguntasRapidasLive.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => enviarPregunta(q)}
                disabled={pensando}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-karuma-300 hover:bg-karuma-50 hover:text-karuma-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Pregunta sobre reseñas, ventas o beneficio..."
              className={inputClass}
              disabled={pensando}
            />
            <Button type="submit" disabled={pensando || !pregunta.trim()} className="gap-2 sm:shrink-0">
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
