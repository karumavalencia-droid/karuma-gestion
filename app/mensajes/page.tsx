"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ThreadItem } from "@/components/inbox/ThreadItem";
import type { Contadores, ThreadResumen } from "@/components/inbox/tipos";
import { BotonAvisos } from "@/components/inbox/BotonAvisos";
import Link from "next/link";
import { BarChart3, Inbox, RefreshCw } from "lucide-react";

type Filtro = {
  clave: string;
  etiqueta: string;
  params: Record<string, string>;
};

const FILTROS: Filtro[] = [
  { clave: "pendientes", etiqueta: "Sin responder", params: { status: "pendientes" } },
  { clave: "altas", etiqueta: "Prioritarios", params: { priority: "altas" } },
  { clave: "todos", etiqueta: "Todos", params: {} },
  { clave: "instagram", etiqueta: "Instagram", params: { platform: "instagram" } },
  { clave: "google", etiqueta: "Google", params: { platform: "google" } },
  { clave: "tripadvisor", etiqueta: "Tripadvisor", params: { platform: "tripadvisor" } },
];

type Respuesta = {
  threads: (ThreadResumen & { extracto?: string | null })[];
  cursor: string | null;
};

export default function MensajesPage() {
  // useSearchParams obliga a un límite de Suspense en las páginas estáticas.
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-gray-500">Cargando…</p>}>
      <Bandeja />
    </Suspense>
  );
}

function Bandeja() {
  const params = useSearchParams();
  // La campana enlaza con ?platform=instagram: el filtro debe reflejarlo.
  const filtroInicial = params.get("platform") ?? params.get("filtro") ?? "pendientes";
  const [filtro, setFiltro] = useState(
    FILTROS.some((f) => f.clave === filtroInicial) ? filtroInicial : "pendientes",
  );
  const [threads, setThreads] = useState<(ThreadResumen & { extracto?: string | null })[]>([]);
  const [contadores, setContadores] = useState<Contadores | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    setError("");
    try {
      const activo = FILTROS.find((f) => f.clave === filtro) ?? FILTROS[0];
      const params = new URLSearchParams(activo.params);
      const [resThreads, resContadores] = await Promise.all([
        fetch(`/api/inbox/threads?${params}`, { cache: "no-store" }),
        fetch("/api/inbox/unread", { cache: "no-store" }),
      ]);

      const cuerpo = (await resThreads.json()) as Respuesta & { error?: string };
      if (!resThreads.ok) throw new Error(cuerpo.error || "Error cargando los mensajes");
      setThreads(cuerpo.threads ?? []);

      if (resContadores.ok) setContadores((await resContadores.json()) as Contadores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando los mensajes");
    } finally {
      setCargando(false);
      setAhoraMs(Date.now());
    }
  }, [filtro]);

  useEffect(() => {
    setCargando(true);
    void cargar();
  }, [cargar]);

  // Refresco periódico: mantiene al día la bandeja y el semáforo de retraso
  // sin que nadie tenga que recargar la página.
  useEffect(() => {
    const id = setInterval(() => void cargar(), 60_000);
    return () => clearInterval(id);
  }, [cargar]);

  // El semáforo depende del reloj, no de los datos: se refresca aparte.
  useEffect(() => {
    const id = setInterval(() => setAhoraMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const resumen = useMemo(() => {
    if (!contadores) return null;
    const partes = Object.entries(contadores.porPlataforma)
      .filter(([, n]) => n > 0)
      .map(([plataforma, n]) => `${plataforma}: ${n}`);
    return partes.length > 0 ? partes.join(" · ") : null;
  }, [contadores]);

  return (
    <div className="space-y-5">
      <PageHeader
        hideTitle
        description="Instagram, Google y Tripadvisor en una sola bandeja. Ningún cliente sin respuesta."
      >
        <BotonAvisos />
        <Link
          href="/mensajes/insights"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analítica
        </Link>
        <button
          type="button"
          onClick={() => void cargar()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </PageHeader>

      {contadores && contadores.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-gray-900">{contadores.total}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">sin responder</p>
            {resumen && <p className="truncate text-xs text-gray-500">{resumen}</p>}
          </div>
          {contadores.urgentes > 0 && (
            <span className="ml-auto rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
              {contadores.urgentes} prioritario{contadores.urgentes === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => setFiltro(f.clave)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f.clave
                ? "bg-karuma-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <Card className="px-2 py-1">
        {cargando ? (
          <p className="px-2 py-8 text-center text-sm text-gray-500">Cargando…</p>
        ) : threads.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <Inbox className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              {filtro === "pendientes"
                ? "No hay mensajes sin responder"
                : "No hay mensajes en este filtro"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Los mensajes de Instagram, Google y Tripadvisor aparecerán aquí en cuanto
              se conecten las cuentas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                extracto={thread.extracto ?? undefined}
                ahoraMs={ahoraMs}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
