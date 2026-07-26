"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { PlatformBadge } from "./PlatformBadge";
import { debeAvisar, lanzarAviso, preferenciaActiva } from "@/lib/inbox/avisos";

type Contadores = {
  total: number;
  porPlataforma: Record<string, number>;
  urgentes: number;
  enHorario: boolean;
};

const VACIO: Contadores = { total: 0, porPlataforma: {}, urgentes: 0, enHorario: false };

/**
 * Campana del header: mensajes sin responder, con el desglose por plataforma.
 *
 * Solo la consultan los roles con acceso al Inbox — para el resto el endpoint
 * responde 403 y no tiene sentido preguntarlo cada minuto.
 */
export function CampanaInbox({ role }: { role: string }) {
  const puedeVer = role === "owner" || role === "manager";
  const [contadores, setContadores] = useState<Contadores>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const anterior = useRef<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!puedeVer) return;
    let vivo = true;

    const cargar = async () => {
      try {
        const res = await fetch("/api/inbox/unread", { cache: "no-store" });
        if (!res.ok) return;
        const cuerpo = (await res.json()) as Partial<Contadores>;
        if (!vivo) return;

        const datos: Contadores = {
          total: cuerpo.total ?? 0,
          porPlataforma: cuerpo.porPlataforma ?? {},
          urgentes: cuerpo.urgentes ?? 0,
          enHorario: cuerpo.enHorario ?? false,
        };
        setContadores(datos);

        if (
          debeAvisar({
            anterior: anterior.current,
            actual: datos.total,
            visible: document.visibilityState === "visible",
            permiso: typeof Notification !== "undefined" ? Notification.permission : "default",
            preferencia: preferenciaActiva(),
            enHorario: datos.enHorario,
          })
        ) {
          lanzarAviso(datos.total - (anterior.current ?? 0), datos.urgentes);
        }
        anterior.current = datos.total;
      } catch {
        /* sin red: se reintenta en el siguiente ciclo */
      }
    };

    void cargar();
    const id = setInterval(() => void cargar(), 60_000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [puedeVer]);

  // Cerrar al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (!puedeVer) return null;

  const plataformas = Object.entries(contadores.porPlataforma)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label={
          contadores.total > 0
            ? `Mensajes: ${contadores.total} sin responder`
            : "Mensajes y reseñas"
        }
        aria-expanded={abierto}
      >
        <Bell className="h-5 w-5" />
        {contadores.total > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-karuma-500 px-1 text-[10px] font-bold leading-none text-white">
            {contadores.total > 9 ? "9+" : contadores.total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              {contadores.total === 0
                ? "Todo respondido"
                : `${contadores.total} sin responder`}
            </p>
            {contadores.urgentes > 0 && (
              <p className="mt-0.5 text-xs font-medium text-red-600">
                {contadores.urgentes} prioritario{contadores.urgentes === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {plataformas.length > 0 && (
            <div className="divide-y divide-gray-50">
              {plataformas.map(([plataforma, n]) => (
                <Link
                  key={plataforma}
                  href={`/mensajes?platform=${plataforma}`}
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                >
                  <PlatformBadge platform={plataforma} />
                  <span className="text-sm font-semibold text-gray-900">{n}</span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/mensajes"
            onClick={() => setAbierto(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-karuma-600 hover:bg-gray-50"
          >
            Ver todos los mensajes
          </Link>
        </div>
      )}
    </div>
  );
}
