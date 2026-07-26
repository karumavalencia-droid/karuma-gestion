"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlatformBadge } from "@/components/inbox/PlatformBadge";
import { ETIQUETAS_INTENCION } from "@/components/inbox/tipos";

type Conteo = { clave: string; n: number };

type Insights = {
  rango: { desde: string; hasta: string; dias: number };
  truncado: boolean;
  totales: {
    hilos: number;
    mensajesEntrantes: number;
    respondidos: number;
    sinResponder: number;
    quejas: number;
  };
  porDia: { fecha: string; entrantes: number }[];
  porPlataforma: Conteo[];
  intenciones: Conteo[];
  idiomas: (Conteo & { paisEstimado: string })[];
  respuesta: {
    muestra: number;
    medianaMin: number | null;
    mediaMin: number | null;
    dentro30: number;
    dentro60: number;
  };
  sentimiento: { medio: number | null; positivos: number; neutros: number; negativos: number };
  ia: { sugerencias: number; usadas: number; porcentaje: number | null };
  productos: { catalogo: number; menciones: Conteo[] };
  empleados: { catalogo: number; menciones: Conteo[] };
};

const RANGOS = [
  { dias: 7, etiqueta: "7 días" },
  { dias: 30, etiqueta: "30 días" },
  { dias: 90, etiqueta: "90 días" },
];

export default function InsightsPage() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState<Insights | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/inbox/insights?dias=${dias}`, { cache: "no-store" });
      const cuerpo = (await res.json()) as Insights & { error?: string };
      if (!res.ok) throw new Error(cuerpo.error || "Error cargando la analítica");
      setDatos(cuerpo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando la analítica");
    } finally {
      setCargando(false);
    }
  }, [dias]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-5">
      <Link
        href="/mensajes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Mensajes
      </Link>

      <PageHeader hideTitle description="Qué preguntan los clientes, en qué idioma y cuánto se tarda en contestar.">
        <div className="flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              type="button"
              onClick={() => setDias(r.dias)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                dias === r.dias
                  ? "bg-karuma-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      {cargando && !datos ? (
        <p className="py-10 text-center text-sm text-gray-500">Cargando…</p>
      ) : !datos ? null : datos.totales.hilos === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-gray-500">
            No hay mensajes en los últimos {datos.rango.dias} días.
          </p>
        </Card>
      ) : (
        <>
          {datos.truncado && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              El rango supera el tope de 5.000 mensajes: las menciones y el reparto por
              día se calculan sobre los más recientes.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra valor={datos.totales.mensajesEntrantes} etiqueta="mensajes recibidos" />
            <Cifra
              valor={datos.respuesta.medianaMin != null ? formatoMin(datos.respuesta.medianaMin) : "—"}
              etiqueta="mediana de respuesta"
              nota={
                datos.respuesta.mediaMin != null
                  ? `media ${formatoMin(datos.respuesta.mediaMin)}`
                  : undefined
              }
            />
            <Cifra
              valor={datos.totales.sinResponder}
              etiqueta="sin responder"
              acento={datos.totales.sinResponder > 0}
            />
            <Cifra
              valor={datos.ia.porcentaje != null ? `${datos.ia.porcentaje}%` : "—"}
              etiqueta="borradores de IA usados"
              nota={`${datos.ia.usadas} de ${datos.ia.sugerencias}`}
            />
          </div>

          <Card title={`Mensajes por día (${datos.rango.dias} días)`}>
            <GraficoDias datos={datos.porDia} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Plataformas">
              <Barras
                datos={datos.porPlataforma}
                render={(clave) => <PlatformBadge platform={clave} />}
              />
            </Card>

            <Card title="Qué preguntan">
              <Barras
                datos={datos.intenciones}
                render={(clave) => (
                  <span className="text-sm text-gray-700">
                    {ETIQUETAS_INTENCION[clave] ?? clave}
                  </span>
                )}
              />
            </Card>

            <Card title="Idiomas">
              <Barras
                datos={datos.idiomas}
                render={(clave) => {
                  const fila = datos.idiomas.find((i) => i.clave === clave);
                  return (
                    <span className="text-sm text-gray-700">
                      <span className="font-medium uppercase">{clave}</span>
                      <span className="ml-2 text-xs text-gray-400">{fila?.paisEstimado}</span>
                    </span>
                  );
                }}
              />
              <p className="mt-3 flex items-start gap-1.5 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                El país es una <strong className="font-medium">estimación por idioma</strong>,
                no un dato real: quien escribe en inglés no tiene por qué ser de un país
                anglófono.
              </p>
            </Card>

            <Card title="Tono de los mensajes">
              <div className="space-y-2 text-sm">
                <Fila etiqueta="Positivos" valor={datos.sentimiento.positivos} clase="text-emerald-700" />
                <Fila etiqueta="Neutros" valor={datos.sentimiento.neutros} />
                <Fila etiqueta="Negativos" valor={datos.sentimiento.negativos} clase="text-red-700" />
                <Fila etiqueta="Quejas marcadas" valor={datos.totales.quejas} clase="text-red-700" />
              </div>
            </Card>

            <Card title="Productos mencionados">
              {datos.productos.catalogo === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay catálogo de inventario con el que cruzar las menciones.
                </p>
              ) : datos.productos.menciones.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Ningún producto del inventario aparece en los mensajes de este periodo.
                </p>
              ) : (
                <Barras
                  datos={datos.productos.menciones}
                  render={(clave) => <span className="text-sm text-gray-700">{clave}</span>}
                />
              )}
            </Card>

            <Card title="Empleados mencionados">
              {datos.empleados.menciones.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Ningún empleado aparece por su nombre en los mensajes de este periodo.
                </p>
              ) : (
                <Barras
                  datos={datos.empleados.menciones}
                  render={(clave) => <span className="text-sm text-gray-700">{clave}</span>}
                />
              )}
            </Card>
          </div>

          <Card title="Velocidad de respuesta">
            {datos.respuesta.muestra === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay ninguna respuesta enviada en este periodo.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <Fila
                  etiqueta="Contestados en menos de 30 min"
                  valor={`${datos.respuesta.dentro30} de ${datos.respuesta.muestra}`}
                  clase="text-emerald-700"
                />
                <Fila
                  etiqueta="Contestados en menos de 1 h"
                  valor={`${datos.respuesta.dentro60} de ${datos.respuesta.muestra}`}
                />
                <p className="border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                  Se muestra la <strong className="font-medium">mediana</strong> como cifra
                  principal: un solo hilo olvidado durante días dispara la media y da una
                  imagen falsa del servicio habitual.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Cifra({
  valor,
  etiqueta,
  nota,
  acento,
}: {
  valor: number | string;
  etiqueta: string;
  nota?: string;
  acento?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold ${acento ? "text-karuma-600" : "text-gray-900"}`}>
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{etiqueta}</p>
      {nota && <p className="text-[11px] text-gray-400">{nota}</p>}
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
  clase = "text-gray-900",
}: {
  etiqueta: string;
  valor: number | string;
  clase?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{etiqueta}</span>
      <span className={`font-semibold ${clase}`}>{valor}</span>
    </div>
  );
}

function Barras({
  datos,
  render,
}: {
  datos: Conteo[];
  render: (clave: string) => React.ReactNode;
}) {
  if (datos.length === 0) {
    return <p className="text-sm text-gray-500">Sin datos en este periodo.</p>;
  }
  const maximo = Math.max(...datos.map((d) => d.n));

  return (
    <div className="space-y-2.5">
      {datos.map((d) => (
        <div key={d.clave}>
          <div className="flex items-center justify-between gap-2">
            {render(d.clave)}
            <span className="shrink-0 text-xs font-semibold text-gray-900">{d.n}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-karuma-500"
              style={{ width: `${Math.max((d.n / maximo) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GraficoDias({ datos }: { datos: { fecha: string; entrantes: number }[] }) {
  const maximo = Math.max(...datos.map((d) => d.entrantes), 1);

  return (
    <div>
      <div className="flex h-28 items-end gap-[2px] overflow-x-auto">
        {datos.map((d) => (
          <div
            key={d.fecha}
            className="group relative flex-1 rounded-t bg-karuma-500/80 transition-colors hover:bg-karuma-600"
            style={{ height: `${Math.max((d.entrantes / maximo) * 100, 2)}%`, minWidth: 4 }}
            title={`${d.fecha}: ${d.entrantes} mensaje${d.entrantes === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{datos[0]?.fecha.slice(5)}</span>
        <span>máx. {maximo}/día</span>
        <span>{datos[datos.length - 1]?.fecha.slice(5)}</span>
      </div>
    </div>
  );
}

function formatoMin(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return `${Math.floor(horas / 24)} d`;
}
