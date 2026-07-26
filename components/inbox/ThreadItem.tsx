"use client";

import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { PlatformBadge } from "./PlatformBadge";
import { PriorityDot, SlaBadge, tiempoRelativo } from "./SlaBadge";
import { iniciales, type ThreadResumen } from "./tipos";

export function ThreadItem({
  thread,
  extracto,
  ahoraMs,
}: {
  thread: ThreadResumen;
  extracto?: string;
  ahoraMs: number;
}) {
  const nombre = thread.customer_name ?? thread.customer_username ?? "Cliente";

  return (
    <Link
      href={`/mensajes/${thread.id}`}
      className="flex gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
          {iniciales(nombre)}
        </div>
        <span className="absolute -bottom-1 -right-1">
          <PlatformBadge platform={thread.platform} soloIcono />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PriorityDot priority={thread.priority} />
          <p
            className={`truncate text-sm ${
              thread.unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
            }`}
          >
            {nombre}
          </p>
          {thread.rating != null && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-amber-600">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {thread.rating}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-gray-400">
            {tiempoRelativo(thread.last_message_at, ahoraMs)}
          </span>
        </div>

        {extracto && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{extracto}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <SlaBadge
            primeraEntrada={thread.first_inbound_at}
            ahoraMs={ahoraMs}
            respondido={thread.replied}
          />
          {thread.is_complaint && (
            <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
              Queja
            </span>
          )}
          {thread.intents.includes("alergia") && (
            <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
              Alergia
            </span>
          )}
          {thread.replied && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              Respondido
            </span>
          )}
          {thread.language && thread.language !== "es" && (
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-600">
              {thread.language}
            </span>
          )}
        </div>
      </div>

      {thread.unread && (
        <span
          className="mt-1 h-2 w-2 shrink-0 self-start rounded-full bg-karuma-500"
          aria-label="Sin leer"
        />
      )}
    </Link>
  );
}

/** Chip de "hay borrador de IA", cuando se conoce. */
export function ChipIa() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
      <Sparkles className="h-3 w-3" />
      Borrador listo
    </span>
  );
}
