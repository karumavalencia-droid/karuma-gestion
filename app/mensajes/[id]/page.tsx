"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PlatformBadge, KindBadge } from "@/components/inbox/PlatformBadge";
import { SlaBadge, tiempoRelativo } from "@/components/inbox/SlaBadge";
import {
  ETIQUETAS_INTENCION,
  iniciales,
  type MensajeApi,
  type SugerenciaApi,
  type ThreadResumen,
} from "@/components/inbox/tipos";

type Detalle = {
  thread: ThreadResumen;
  mensajes: MensajeApi[];
  sugerencia: SugerenciaApi | null;
};

export default function ConversacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [borrador, setBorrador] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const res = await fetch(`/api/inbox/threads/${id}`, { cache: "no-store" });
      const cuerpo = (await res.json()) as Detalle & { error?: string };
      if (!res.ok) throw new Error(cuerpo.error || "Error cargando la conversación");
      setDetalle(cuerpo);
      setBorrador((actual) => actual || cuerpo.sugerencia?.reply_text || "");
      setAhoraMs(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando la conversación");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enviar = async () => {
    if (!id || !borrador.trim()) return;
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const res = await fetch(`/api/inbox/threads/${id}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          texto: borrador.trim(),
          sugerenciaId:
            detalle?.sugerencia && borrador.trim() === detalle.sugerencia.reply_text
              ? detalle.sugerencia.id
              : undefined,
        }),
      });
      const cuerpo = (await res.json()) as { error?: string; permalink?: string };

      // 409 = la plataforma no permite responder por API (Tripadvisor).
      if (res.status === 409) {
        await navigator.clipboard.writeText(borrador.trim()).catch(() => {});
        setAviso(
          "Respuesta copiada. Esta plataforma no permite responder desde aquí: pégala en su panel.",
        );
        if (cuerpo.permalink) window.open(cuerpo.permalink, "_blank", "noopener");
        return;
      }
      if (!res.ok) throw new Error(cuerpo.error || "No se pudo enviar la respuesta");

      setBorrador("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la respuesta");
    } finally {
      setEnviando(false);
    }
  };

  const regenerar = async () => {
    if (!id) return;
    setGenerando(true);
    setError("");
    try {
      const res = await fetch(`/api/inbox/threads/${id}/ai`, { method: "POST" });
      const cuerpo = (await res.json()) as { sugerencia?: SugerenciaApi; error?: string };
      if (!res.ok) throw new Error(cuerpo.error || "No se pudo generar el borrador");
      if (cuerpo.sugerencia) {
        setBorrador(cuerpo.sugerencia.reply_text);
        setDetalle((d) => (d ? { ...d, sugerencia: cuerpo.sugerencia! } : d));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el borrador");
    } finally {
      setGenerando(false);
    }
  };

  const marcarHecho = async () => {
    if (!id) return;
    await fetch(`/api/inbox/threads/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cerrado" }),
    });
    router.push("/mensajes");
  };

  if (cargando) {
    return <p className="py-10 text-center text-sm text-gray-500">Cargando…</p>;
  }

  if (!detalle) {
    return (
      <div className="space-y-4">
        <Volver />
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error || "Conversación no encontrada"}
        </p>
      </div>
    );
  }

  const { thread, mensajes, sugerencia } = detalle;
  const nombre = thread.customer_name ?? thread.customer_username ?? "Cliente";

  return (
    <div className="space-y-4">
      <Volver />

      {/* Ficha del cliente */}
      <Card>
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
            {iniciales(nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{nombre}</p>
              {thread.customer_username && (
                <span className="truncate text-xs text-gray-500">@{thread.customer_username}</span>
              )}
              {thread.rating != null && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {thread.rating}/5
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <PlatformBadge platform={thread.platform} />
              <KindBadge kind={thread.kind} />
              <SlaBadge
                primeraEntrada={thread.first_inbound_at}
                ahoraMs={ahoraMs}
                respondido={thread.replied}
              />
            </div>
          </div>
        </div>

        {(thread.intents.length > 0 || thread.language) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
            {thread.language && (
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-600">
                {thread.language}
              </span>
            )}
            {thread.intents.map((intent) => (
              <span
                key={intent}
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${
                  intent === "alergia" || intent === "queja"
                    ? "bg-red-50 text-red-700 ring-red-100"
                    : "bg-gray-100 text-gray-600 ring-gray-200"
                }`}
              >
                {ETIQUETAS_INTENCION[intent] ?? intent}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Hilo */}
      <Card title="Conversación">
        <div className="space-y-3">
          {mensajes.length === 0 && (
            <p className="text-sm text-gray-500">Este hilo no tiene mensajes.</p>
          )}
          {mensajes.map((mensaje) => {
            const propio = mensaje.direction === "out";
            return (
              <div
                key={mensaje.id}
                className={`flex ${propio ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    propio
                      ? "bg-karuma-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{mensaje.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${propio ? "text-white/70" : "text-gray-500"}`}
                  >
                    {propio && mensaje.author_name ? `${mensaje.author_name} · ` : ""}
                    {tiempoRelativo(mensaje.sent_at ?? mensaje.received_at, ahoraMs)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Respuesta */}
      <Card title="Responder">
        {sugerencia && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
            <Sparkles className="h-3 w-3" />
            Borrador propuesto por la IA — revísalo antes de enviar
          </p>
        )}

        <textarea
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          rows={5}
          placeholder="Escribe la respuesta…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
        />

        {aviso && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
            {aviso}
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando || !borrador.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-karuma-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-karuma-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando…" : "Enviar"}
          </button>

          <button
            type="button"
            onClick={() => void regenerar()}
            disabled={generando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${generando ? "animate-pulse" : ""}`} />
            {generando ? "Generando…" : "Regenerar"}
          </button>

          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(borrador)}
            disabled={!borrador.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Copiar
          </button>

          {thread.permalink && (
            <a
              href={thread.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir original
            </a>
          )}

          <button
            type="button"
            onClick={() => void marcarHecho()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Check className="h-4 w-4" />
            Marcar como hecho
          </button>
        </div>
      </Card>
    </div>
  );
}

function Volver() {
  return (
    <Link
      href="/mensajes"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Mensajes
    </Link>
  );
}
