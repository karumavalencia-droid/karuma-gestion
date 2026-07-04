"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  LoaderCircle,
  Moon,
  RefreshCw,
  Sun,
  Sunset,
} from "lucide-react";
import { PortalTabs } from "@/components/portal/PortalTabs";

type ScheduleShift = {
  servicio: "Comida" | "Cena";
  inicio: string;
  fin: string;
};

type ScheduleDay = {
  date: string;
  dateLabel: string;
  weekday: string;
  isToday: boolean;
  descanso: boolean;
  turnos: ScheduleShift[];
};

type SchedulePayload = {
  employee: { id: string; name: string; department: string };
  weekLabel: string;
  source: "supabase" | "plantilla";
  days: ScheduleDay[];
};

const text = {
  title: "Mi horario",
  subtitle: "Tu semana de trabajo en Karuma.",
  loading: "Cargando tu horario…",
  unavailable: "No se pudo cargar el horario.",
  week: "Semana",
  rest: "Descanso",
  today: "Hoy",
  refresh: "Actualizar",
  retry: "Reintentar",
};

function shiftIcon(servicio: ScheduleShift["servicio"]) {
  return servicio === "Comida" ? (
    <Sun className="h-4 w-4" />
  ) : (
    <Sunset className="h-4 w-4" />
  );
}

export default function MySchedulePage() {
  const [data, setData] = useState<SchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/schedule/me", { cache: "no-store" });
      const payload = (await response.json()) as SchedulePayload & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? text.unavailable);
      setData(payload);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : text.unavailable,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-5 pb-24 text-white sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-karuma-300">Karuma ERP</p>
            <h1 className="text-2xl font-bold">{text.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {text.refresh}
          </button>
        </header>

        <section className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl">
          <div className="bg-karuma-600 px-5 py-5 text-white">
            <p className="text-sm text-karuma-100">
              {data?.employee.department ?? ""}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{data?.employee.name ?? ""}</h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-karuma-50">
              <CalendarDays className="h-4 w-4" />
              {data ? `${text.week} ${data.weekLabel}` : text.subtitle}
            </div>
          </div>

          <div className="p-4">
            {loading && !data ? (
              <div className="flex min-h-52 items-center justify-center text-sm text-gray-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                {text.loading}
              </div>
            ) : error && !data ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {text.retry}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.days ?? []).map((day) => (
                  <div
                    key={day.date}
                    className={`rounded-2xl border px-4 py-3 ${
                      day.isToday
                        ? "border-karuma-500 bg-karuma-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {day.weekday}{" "}
                        <span className="font-normal text-gray-400">
                          {day.dateLabel}
                        </span>
                      </p>
                      {day.isToday && (
                        <span className="rounded-full bg-karuma-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {text.today}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {day.descanso ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                          <Moon className="h-4 w-4" />
                          {text.rest}
                        </span>
                      ) : (
                        day.turnos.map((shift) => (
                          <span
                            key={`${day.date}-${shift.servicio}-${shift.inicio}`}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                              shift.servicio === "Comida"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {shiftIcon(shift.servicio)}
                            {shift.servicio} · {shift.inicio}–{shift.fin}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <PortalTabs />
    </main>
  );
}
