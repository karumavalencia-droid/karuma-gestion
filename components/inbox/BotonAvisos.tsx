"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  estadoAvisos,
  guardarPreferencia,
  pedirPermiso,
  type EstadoAvisos,
} from "@/lib/inbox/avisos";

/**
 * Interruptor de los avisos del navegador.
 *
 * El permiso se pide SIEMPRE desde este clic: pedirlo solo al cargar la página
 * es lo que hace que los navegadores lo bloqueen para siempre.
 */
export function BotonAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos>("desactivados");

  // El estado depende de `window`, así que se calcula ya en el cliente.
  useEffect(() => {
    setEstado(estadoAvisos());
  }, []);

  if (estado === "no-soportado") return null;

  if (estado === "bloqueados") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400"
        title="Los avisos están bloqueados en los ajustes del navegador para este sitio"
      >
        <BellOff className="h-3.5 w-3.5" />
        Avisos bloqueados
      </span>
    );
  }

  const activados = estado === "activados";

  return (
    <button
      type="button"
      onClick={async () => {
        if (activados) {
          guardarPreferencia(false);
          setEstado("desactivados");
          return;
        }
        setEstado(await pedirPermiso());
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
        activados
          ? "border-karuma-200 bg-karuma-50 text-karuma-700 hover:bg-karuma-100"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
      title={
        activados
          ? "Recibes un aviso del navegador cuando entra un mensaje nuevo"
          : "Activar avisos del navegador para los mensajes nuevos"
      }
    >
      {activados ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {activados ? "Avisos activados" : "Activar avisos"}
    </button>
  );
}
