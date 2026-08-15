"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Check, Clock, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformBadge } from "@/components/inbox/PlatformBadge";
import { explicarResultado, type ResultadoAutoReply } from "@/lib/inbox/auto-reply";

type Decision = {
  id: string;
  reply_text: string;
  auto_decision: ResultadoAutoReply | null;
  auto_motivo: string | null;
  auto_enviada_at: string | null;
  created_at: string;
  hilo: { id: string; platform: string; rating: number | null; customer_name: string | null } | null;
  mensaje: { body: string } | null;
};

type Ajustes = {
  activa: boolean;
  minEstrellas: number;
  plataformas: string[];
  disponibles: string[];
  puedeEditar: boolean;
  recientes: Decision[];
};

const ESTILO_DECISION: Record<ResultadoAutoReply, string> = {
  enviada: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  simulada: "bg-amber-50 text-amber-700 ring-amber-100",
  revisar: "bg-gray-100 text-gray-600 ring-gray-200",
};

function Estrellas({ n }: { n: number | null }) {
  if (typeof n !== "number") return <span className="text-xs text-gray-400">sin nota</span>;
  return (
    <span className="text-xs font-semibold text-gray-700">
      {"★".repeat(n)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export default function AutoRespuestaPage() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/inbox/settings");
      const data = (await res.json()) as Ajustes & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los ajustes");
      setAjustes(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (patch: Partial<Pick<Ajustes, "activa" | "minEstrellas" | "plataformas">>) => {
    setGuardando(true);
    try {
      const res = await fetch("/api/inbox/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as Ajustes & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setAjustes((prev) => (prev ? { ...prev, ...data } : prev));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const editable = Boolean(ajustes?.puedeEditar) && !guardando;

  return (
    <div className="space-y-5">
      <PageHeader hideTitle description="Qué reseñas contesta el sistema solo y cuáles espera a que veas tú.">
        <Link
          href="/mensajes"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Mensajes
        </Link>
      </PageHeader>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      )}

      {cargando || !ajustes ? (
        <p className="px-2 py-8 text-center text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          {/* Estado */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              {ajustes.activa ? (
                <Send className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {ajustes.activa ? "Publicando automáticamente" : "En simulacro"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {ajustes.activa
                    ? "Las reseñas que cumplen la política se contestan solas, sin que nadie las lea antes."
                    : "El sistema decide y lo apunta, pero no publica nada. Abajo puedes ver qué habría contestado."}
                </p>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => void guardar({ activa: !ajustes.activa })}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ajustes.activa
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-karuma-600 text-white hover:bg-karuma-700"
                  }`}
                >
                  {ajustes.activa ? "Volver a simulacro" : "Activar"}
                </button>
              )}
            </div>

            {!ajustes.activa && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  Antes de activarlo, deja pasar unas semanas y lee la lista de abajo. Una respuesta
                  publicada avisa por email a quien escribió la reseña en ese mismo momento: editarla
                  después ya no lo deshace.
                </span>
              </p>
            )}

            {!ajustes.puedeEditar && (
              <p className="mt-3 text-xs text-gray-400">
                Solo el propietario puede cambiar estos ajustes.
              </p>
            )}
          </Card>

          {/* Política */}
          <Card className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">A partir de cuántas estrellas</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Por debajo de esta nota siempre lo ve una persona.
              </p>
              <div className="mt-2 flex gap-2">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={!editable}
                    onClick={() => void guardar({ minEstrellas: n })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      ajustes.minEstrellas === n
                        ? "bg-karuma-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {n}★ o más
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900">En qué plataformas</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Solo aparecen las que ya saben responder desde aquí.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ajustes.disponibles.map((p) => {
                  const puesta = ajustes.plataformas.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={!editable}
                      onClick={() =>
                        void guardar({
                          plataformas: puesta
                            ? ajustes.plataformas.filter((x) => x !== p)
                            : [...ajustes.plataformas, p],
                        })
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        puesta
                          ? "bg-karuma-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {puesta && <Check className="h-3.5 w-3.5" />}
                      {p}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Google todavía no está: hace falta que aprueben el acceso a su API.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900">Siempre a revisión</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Quejas · tono negativo · alergias · prioridad alta · mensajes directos · borradores
                que mencionan precios, horarios o teléfonos. Esto no se puede desactivar.
              </p>
            </div>
          </Card>

          {/* Simulacro */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-gray-900">
              Últimas decisiones
              {ajustes.recientes.length > 0 && (
                <span className="ml-1.5 font-normal text-gray-400">
                  ({ajustes.recientes.length})
                </span>
              )}
            </h2>

            {ajustes.recientes.length === 0 ? (
              <Card className="px-4 py-8">
                <p className="text-center text-sm text-gray-500">
                  Todavía no hay ninguna. Aparecerán aquí según lleguen reseñas.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {ajustes.recientes.map((d) => {
                  const decision = d.auto_decision ?? "revisar";
                  return (
                    <Card key={d.id} className="space-y-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.hilo && <PlatformBadge platform={d.hilo.platform as never} />}
                        <Estrellas n={d.hilo?.rating ?? null} />
                        <span className="truncate text-xs text-gray-500">
                          {d.hilo?.customer_name ?? "Anónimo"}
                        </span>
                        <span
                          className={`ml-auto shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${ESTILO_DECISION[decision]}`}
                        >
                          {explicarResultado(decision, d.auto_motivo ?? "")}
                        </span>
                      </div>

                      {d.mensaje?.body && (
                        <p className="line-clamp-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                          {d.mensaje.body}
                        </p>
                      )}

                      <p className="text-xs leading-relaxed text-gray-900">
                        <span className="font-medium text-gray-400">Borrador: </span>
                        {d.reply_text}
                      </p>

                      {d.hilo && (
                        <Link
                          href={`/mensajes/${d.hilo.id}`}
                          className="inline-block text-xs font-medium text-karuma-600 hover:underline"
                        >
                          Ver el hilo
                        </Link>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
