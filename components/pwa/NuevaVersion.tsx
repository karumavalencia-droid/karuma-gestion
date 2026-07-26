"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";

/** Id del despliegue con el que se construyó este bundle (ver next.config.ts). */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** No se pregunta al servidor más de una vez por minuto. */
const INTERVALO_MINIMO_MS = 60_000;

/**
 * Avisa cuando la pestaña se ha quedado con el código de un despliegue
 * anterior. Sin esto, una ventana abierta durante un deploy sigue pidiendo
 * assets y payloads del build viejo y acaba pintando un 404 de Next al navegar.
 *
 * Se comprueba al cambiar de página y al volver a la pestaña; nunca recarga
 * sola, para no tirar lo que alguien esté escribiendo en un formulario.
 */
export function NuevaVersion() {
  const pathname = usePathname();
  const [hayNueva, setHayNueva] = useState(false);
  const descartado = useRef(false);
  const ultimaComprobacion = useRef(0);

  const comprobar = useCallback(async () => {
    if (BUILD_ID === "dev" || descartado.current || hayNueva) return;
    const ahora = Date.now();
    if (ahora - ultimaComprobacion.current < INTERVALO_MINIMO_MS) return;
    ultimaComprobacion.current = ahora;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { buildId?: string };
      if (body.buildId && body.buildId !== "dev" && body.buildId !== BUILD_ID) {
        setHayNueva(true);
      }
    } catch {
      /* sin red: se reintenta en la siguiente navegación */
    }
  }, [hayNueva]);

  useEffect(() => {
    void comprobar();
  }, [comprobar, pathname]);

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") void comprobar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [comprobar]);

  if (!hayNueva) return null;

  return (
    // Abajo, para no tapar la cabecera ni el botón del menú.
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 bg-gray-900 px-4 pt-2 text-sm text-white shadow-lg"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <span>Hay una versión nueva de Karuma ERP.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-100"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => {
          descartado.current = true;
          setHayNueva(false);
        }}
        aria-label="Cerrar aviso"
        className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
