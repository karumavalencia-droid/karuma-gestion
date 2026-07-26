"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { estadoSla } from "@/lib/inbox/rules";

/**
 * Semáforo de retraso: <30 min normal · 30-60 min ámbar · >60 min rojo.
 *
 * Se calcula en el cliente a partir de `first_inbound_at`. No hace falta
 * ningún proceso periódico — y en el plan Hobby de Vercel los crons tienen
 * ventana de 1 h, así que tampoco serviría.
 */
export function SlaBadge({
  primeraEntrada,
  ahoraMs,
  respondido,
}: {
  primeraEntrada: string | null;
  ahoraMs: number;
  respondido: boolean;
}) {
  if (respondido || !primeraEntrada) return null;

  const estado = estadoSla(primeraEntrada, ahoraMs);
  if (estado === "ok") return null;

  const minutos = Math.floor((ahoraMs - new Date(primeraEntrada).getTime()) / 60000);
  const texto = minutos >= 120 ? `${Math.floor(minutos / 60)} h` : `${minutos} min`;

  const clase =
    estado === "urgente"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-amber-50 text-amber-700 ring-amber-100";
  const Icon = estado === "urgente" ? AlertTriangle : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${clase}`}
      title={`Sin responder desde hace ${texto}`}
    >
      <Icon className="h-3 w-3" />
      {texto}
    </span>
  );
}

/** Punto de prioridad. Solo se pinta a partir de "alta": el resto es ruido. */
export function PriorityDot({ priority }: { priority: string }) {
  if (priority !== "alta" && priority !== "urgente") return null;
  const clase = priority === "urgente" ? "bg-red-500" : "bg-amber-500";
  const titulo = priority === "urgente" ? "Urgente" : "Prioridad alta";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${clase}`}
      title={titulo}
      aria-label={titulo}
    />
  );
}

/** Tiempo relativo corto: "hace 5 min", "hace 3 h", "12 jul". */
export function tiempoRelativo(iso: string | null, ahoraMs: number): string {
  if (!iso) return "";
  const minutos = Math.floor((ahoraMs - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
