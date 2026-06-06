"use client";

import { FormEvent, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Euro,
  Lightbulb,
  Receipt,
  Send,
  ShieldAlert,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import {
  alertasInteligentes,
  getEtiquetaRiesgo,
  getRespuestaGerente,
  preguntasRapidas,
  recomendacionesIA,
  resumenDiaIA,
  type TipoAlertaIA,
} from "@/lib/data/ai-gerente";
import { formatCurrency } from "@/lib/utils";

interface MensajeChat {
  id: string;
  rol: "usuario" | "gerente";
  texto: string;
}

const alertaIcono: Record<TipoAlertaIA, typeof AlertTriangle> = {
  stock_bajo: AlertTriangle,
  producto_critico: ShieldAlert,
  gasto_alto: Euro,
  personal_insuficiente: Users,
  delivery_bajo: Truck,
};

const alertaVariant = {
  alta: "danger" as const,
  media: "warning" as const,
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

export function AiGerentePanel() {
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: "bienvenida",
      rol: "gerente",
      texto:
        "Buenas. Soy tu gerente IA de Karuma. Puedo resumir ventas, stock, personal y delivery con datos simulados del restaurante. ¿En qué te ayudo?",
    },
  ]);
  const [pensando, setPensando] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const enviarPregunta = (texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed || pensando) return;

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
          texto: getRespuestaGerente(trimmed),
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

  return (
    <div>
      <PageHeader
        title="AI Gerente"
        description="Panel inteligente — resumen operativo de Karuma Sushi & Grill"
      >
        <div className="flex items-center gap-2 rounded-lg bg-karuma-50 px-3 py-2 text-xs font-medium text-karuma-700">
          <Sparkles className="h-4 w-4" />
          Datos simulados
        </div>
      </PageHeader>

      <section className="mb-4 sm:mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Resumen del día
        </h2>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
          <StatCard
            title="Ventas estimadas hoy"
            value={formatCurrency(resumenDiaIA.ventasEstimadas)}
            icon={Euro}
            trend="+12,4% vs ayer"
            trendUp
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Clientes estimados"
            value={String(resumenDiaIA.clientesEstimados)}
            subtitle="Sala + delivery"
            icon={Users}
            iconColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="Ticket medio"
            value={formatCurrency(resumenDiaIA.ticketMedio)}
            icon={Receipt}
            iconColor="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="Pedidos delivery"
            value={String(resumenDiaIA.pedidosDelivery)}
            subtitle="Uber Eats + Glovo + Just Eat"
            icon={Truck}
            iconColor="bg-karuma-50 text-karuma-600"
          />
          <StatCard
            title="Nivel de riesgo"
            value={getEtiquetaRiesgo(resumenDiaIA.nivelRiesgo)}
            subtitle="Operaciones hoy"
            icon={ShieldAlert}
            iconColor={
              resumenDiaIA.nivelRiesgo === "alto"
                ? "bg-red-50 text-red-600"
                : resumenDiaIA.nivelRiesgo === "medio"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            }
          />
        </div>
        <p className="rounded-xl border border-karuma-100 bg-karuma-50/50 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {resumenDiaIA.resumenTexto}
        </p>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-2 lg:gap-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Alertas inteligentes
          </h2>
          <Card>
            <div className="space-y-3">
              {alertasInteligentes.map((alerta) => {
                const Icon = alertaIcono[alerta.tipo];
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
              {recomendacionesIA.map((rec, index) => (
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
                      Impacto {rec.impacto === "alto" ? "alto" : "medio"} · Sugerencia #{index + 1}
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
                  Analizando datos del restaurante…
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {preguntasRapidas.map((q) => (
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
              placeholder="Pregunta al gerente IA..."
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
