"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type Tema = "sistema" | "claro" | "oscuro";

export const CLAVE_TEMA = "karuma.tema";

/**
 * Páginas públicas de cliente: NUNCA heredan el tema del ERP.
 *
 * `/reservas` tiene su propia paleta (washi y tinta) y con el modo oscuro del
 * ERP las tarjetas quedaban oscuras con texto oscuro: un cliente con el móvil
 * en oscuro se encontraría la reserva ilegible. El tema es una preferencia del
 * personal, no del comensal.
 */
export const RUTAS_PUBLICAS = ["/reservas", "/kiosk"];

export function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Guion que se inyecta en el <head> para aplicar el tema ANTES del primer
 * pintado. Sin esto, la app aparece en claro durante unos milisegundos y luego
 * salta a oscuro: el clásico fogonazo blanco que molesta de noche.
 *
 * Va como cadena porque tiene que ejecutarse antes de que React hidrate.
 */
export const GUION_TEMA = `
try {
  var p = location.pathname;
  var publica = ${JSON.stringify(RUTAS_PUBLICAS)}.some(function (r) {
    return p === r || p.indexOf(r + "/") === 0;
  });
  var t = localStorage.getItem(${JSON.stringify(CLAVE_TEMA)});
  var oscuro = !publica && (t === "oscuro" ||
    (t === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  document.documentElement.classList.toggle("dark", oscuro);
} catch (e) {}
`.trim();

type Contexto = {
  tema: Tema;
  oscuroActivo: boolean;
  setTema: (tema: Tema) => void;
};

const TemaContext = createContext<Contexto>({
  tema: "sistema",
  oscuroActivo: false,
  setTema: () => {},
});

function esOscuro(tema: Tema): boolean {
  if (tema === "oscuro") return true;
  if (tema === "claro") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publica = esRutaPublica(pathname ?? "");
  const [tema, setTemaEstado] = useState<Tema>("claro");
  const [oscuroActivo, setOscuroActivo] = useState(false);

  // Lectura inicial: el guion del <head> ya ha puesto la clase, aquí solo se
  // sincroniza el estado de React con lo que hay.
  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE_TEMA) as Tema | null;
    // Por defecto CLARO, no "sistema": el oscuro es nuevo y solo se ha podido
    // revisar a fondo en unas pocas pantallas. Que lo encienda quien quiera en
    // vez de aparecer solo en el móvil de todo el personal.
    const inicial: Tema =
      guardado === "claro" || guardado === "oscuro" || guardado === "sistema"
        ? guardado
        : "claro";
    setTemaEstado(inicial);
    setOscuroActivo(document.documentElement.classList.contains("dark"));
  }, []);

  // Al entrar o salir de una página pública hay que reaplicar (o quitar) el tema.
  useEffect(() => {
    const oscuro = !publica && esOscuro(tema);
    document.documentElement.classList.toggle("dark", oscuro);
    setOscuroActivo(oscuro);
  }, [publica, tema]);

  // Con "sistema", seguir los cambios del sistema operativo en caliente.
  useEffect(() => {
    if (tema !== "sistema" || publica) return;
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => {
      const oscuro = consulta.matches;
      document.documentElement.classList.toggle("dark", oscuro);
      setOscuroActivo(oscuro);
    };
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, [tema, publica]);

  const setTema = useCallback(
    (nuevo: Tema) => {
      setTemaEstado(nuevo);
      window.localStorage.setItem(CLAVE_TEMA, nuevo);
      const oscuro = !publica && esOscuro(nuevo);
      document.documentElement.classList.toggle("dark", oscuro);
      setOscuroActivo(oscuro);
    },
    [publica],
  );

  return (
    <TemaContext.Provider value={{ tema, oscuroActivo, setTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema(): Contexto {
  return useContext(TemaContext);
}
