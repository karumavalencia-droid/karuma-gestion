"use client";

import { isTableBlockReservation } from "@/lib/reservas/helpers";
import type { ReservaLocal, ServicioLocal } from "@/lib/reservas/local-store";

// Estados que cuentan como "mesa hecha": el cliente llegó a sentarse.
const ESTADOS_HECHOS = new Set<ReservaLocal["estado"]>(["sentada", "walkin", "finished"]);

function statsHechas(reservas: ReservaLocal[], servicio: ServicioLocal) {
  const hechas = reservas.filter(
    (r) =>
      r.servicio === servicio &&
      ESTADOS_HECHOS.has(r.estado) &&
      !isTableBlockReservation(r),
  );
  return {
    mesas: hechas.length,
    pax: hechas.reduce((s, r) => s + (r.personas || 0), 0),
  };
}

/**
 * Resumen fijo en la esquina: mesas hechas y comensales por servicio.
 * "Hechas" = sentadas + walk-ins + finalizadas (lo que realmente se sirvió),
 * así el número no se borra cuando el servicio termina.
 */
export function ResumenServicios({ reservas }: { reservas: ReservaLocal[] }) {
  const comida = statsHechas(reservas, "comida");
  const cena = statsHechas(reservas, "cena");

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 select-none rounded-xl bg-gray-900/90 px-3.5 py-2.5 text-xs text-white shadow-lg backdrop-blur">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        Hecho hoy
      </p>
      <div className="space-y-0.5 font-medium">
        <p className="whitespace-nowrap">
          🍱 Comida&nbsp;
          <span className="font-bold text-amber-300">{comida.mesas}</span> mesas ·{" "}
          <span className="font-bold text-amber-300">{comida.pax}</span> pax
        </p>
        <p className="whitespace-nowrap">
          🍣 Cena&nbsp;
          <span className="font-bold text-sky-300">{cena.mesas}</span> mesas ·{" "}
          <span className="font-bold text-sky-300">{cena.pax}</span> pax
        </p>
      </div>
    </div>
  );
}
