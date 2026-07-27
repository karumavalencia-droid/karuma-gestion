"use client";

import { Moon, Sun } from "lucide-react";
import { useTema } from "@/lib/theme/ThemeProvider";

/**
 * Interruptor de tema. Alterna claro/oscuro con un clic; el estado "sistema"
 * se conserva si nadie ha tocado nunca el botón, para respetar el ajuste del
 * móvil o del ordenador.
 */
export function BotonTema() {
  const { oscuroActivo, setTema } = useTema();

  return (
    <button
      type="button"
      onClick={() => setTema(oscuroActivo ? "claro" : "oscuro")}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      aria-label={oscuroActivo ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuroActivo ? "Tema claro" : "Tema oscuro"}
    >
      {oscuroActivo ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
