/**
 * Inbox — agregación para la página de analítica.
 *
 * Todo son funciones puras sobre filas ya leídas: sin red ni base de datos, de
 * modo que se pueden probar enteras (`npm run test:inbox`). La ruta de API se
 * limita a traer los datos y llamar aquí.
 */

import { normalizar } from "./rules";

export type FilaHilo = {
  platform: string;
  language: string | null;
  intents: string[] | null;
  is_complaint: boolean;
  rating: number | null;
  sentiment: number | null;
  first_inbound_at: string | null;
  replied_at: string | null;
  replied: boolean;
  status: string;
};

export type FilaMensaje = {
  direction: string;
  body: string | null;
  sent_at: string | null;
  received_at: string;
};

export type Conteo = { clave: string; n: number };

/** Mensajes entrantes por día, con los días vacíos rellenados a 0. */
export function porDia(
  mensajes: FilaMensaje[],
  desde: Date,
  hasta: Date,
): { fecha: string; entrantes: number }[] {
  const cuenta = new Map<string, number>();

  for (const m of mensajes) {
    if (m.direction !== "in") continue;
    const fecha = (m.sent_at ?? m.received_at).slice(0, 10);
    cuenta.set(fecha, (cuenta.get(fecha) ?? 0) + 1);
  }

  const salida: { fecha: string; entrantes: number }[] = [];
  const cursor = new Date(desde);
  cursor.setUTCHours(0, 0, 0, 0);
  const fin = new Date(hasta);

  while (cursor <= fin) {
    const clave = cursor.toISOString().slice(0, 10);
    salida.push({ fecha: clave, entrantes: cuenta.get(clave) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return salida;
}

/** Conteo descendente de una lista de claves, quedándose con las `tope` primeras. */
export function contar(claves: (string | null | undefined)[], tope = 10): Conteo[] {
  const mapa = new Map<string, number>();
  for (const clave of claves) {
    if (!clave) continue;
    mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([clave, n]) => ({ clave, n }))
    .sort((a, b) => b.n - a.n || a.clave.localeCompare(b.clave))
    .slice(0, tope);
}

/**
 * Tiempo hasta la primera respuesta.
 *
 * Se da la MEDIANA como cifra principal: un solo hilo olvidado durante dos días
 * dispara la media y da una imagen falsa del servicio habitual. La media se
 * incluye igualmente para poder ver esa diferencia.
 */
export function metricasRespuesta(hilos: FilaHilo[]): {
  muestra: number;
  medianaMin: number | null;
  mediaMin: number | null;
  dentro30: number;
  dentro60: number;
} {
  const minutos: number[] = [];

  for (const hilo of hilos) {
    if (!hilo.replied || !hilo.replied_at || !hilo.first_inbound_at) continue;
    const diff =
      (new Date(hilo.replied_at).getTime() - new Date(hilo.first_inbound_at).getTime()) / 60000;
    // Un valor negativo solo puede venir de datos inconsistentes: se descarta.
    if (diff >= 0) minutos.push(diff);
  }

  if (minutos.length === 0) {
    return { muestra: 0, medianaMin: null, mediaMin: null, dentro30: 0, dentro60: 0 };
  }

  minutos.sort((a, b) => a - b);
  const mitad = Math.floor(minutos.length / 2);
  const mediana =
    minutos.length % 2 === 0 ? (minutos[mitad - 1] + minutos[mitad]) / 2 : minutos[mitad];

  return {
    muestra: minutos.length,
    medianaMin: Math.round(mediana),
    mediaMin: Math.round(minutos.reduce((a, b) => a + b, 0) / minutos.length),
    dentro30: minutos.filter((m) => m <= 30).length,
    dentro60: minutos.filter((m) => m <= 60).length,
  };
}

/**
 * Cuenta cuántos mensajes mencionan cada término de un catálogo (platos del
 * inventario, nombres de empleados…).
 *
 * Compara sin acentos y exigiendo límite de palabra, para que "Alex" no case
 * dentro de "alexandrina". Se ignoran los términos de menos de 3 caracteres:
 * generan más ruido que señal.
 */
export function contarMenciones(
  textos: string[],
  terminos: string[],
  tope = 10,
): Conteo[] {
  const utiles = terminos
    .map((t) => ({ original: t, norm: normalizar(t.trim()) }))
    .filter((t) => t.norm.length >= 3);

  if (utiles.length === 0) return [];

  const cuenta = new Map<string, number>();
  for (const texto of textos) {
    const norm = normalizar(texto ?? "");
    if (!norm) continue;
    for (const termino of utiles) {
      // Un mensaje cuenta una sola vez por término, aunque lo repita.
      if (contienePalabra(norm, termino.norm)) {
        cuenta.set(termino.original, (cuenta.get(termino.original) ?? 0) + 1);
      }
    }
  }

  return [...cuenta.entries()]
    .map(([clave, n]) => ({ clave, n }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n || a.clave.localeCompare(b.clave))
    .slice(0, tope);
}

/** ¿Aparece `termino` como palabra completa dentro de `texto`? Ambos normalizados. */
function contienePalabra(texto: string, termino: string): boolean {
  let desde = 0;
  for (;;) {
    const i = texto.indexOf(termino, desde);
    if (i === -1) return false;
    const antes = i === 0 ? "" : texto[i - 1];
    const despues = texto[i + termino.length] ?? "";
    const esLetra = (c: string) => c !== "" && /[a-z0-9]/.test(c);
    if (!esLetra(antes) && !esLetra(despues)) return true;
    desde = i + 1;
  }
}

/**
 * País más probable a partir del idioma.
 *
 * Es una ESTIMACIÓN y la interfaz debe decirlo: alguien que escribe en inglés
 * no tiene por qué ser británico. Sirve para orientar, no como dato de negocio.
 */
export const PAIS_ESTIMADO: Record<string, string> = {
  es: "España",
  en: "Internacional (inglés)",
  zh: "China",
  fr: "Francia",
  it: "Italia",
  de: "Alemania",
  pt: "Portugal",
};

export function repartoSentimiento(hilos: FilaHilo[]): {
  medio: number | null;
  positivos: number;
  neutros: number;
  negativos: number;
} {
  const valores = hilos
    .map((h) => h.sentiment)
    .filter((s): s is number => typeof s === "number");

  return {
    medio:
      valores.length > 0
        ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100
        : null,
    positivos: valores.filter((s) => s > 0.2).length,
    neutros: valores.filter((s) => s >= -0.2 && s <= 0.2).length,
    negativos: valores.filter((s) => s < -0.2).length,
  };
}
