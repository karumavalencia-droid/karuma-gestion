"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/lib/auth/AuthProvider";
import type {
  AttendanceEvent,
  AttendanceEventType,
} from "@/lib/attendance/types";
import { getKioskDeviceId } from "@/lib/kiosk/offline";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type PersonalAttendancePayload = {
  businessDate: string;
  serverTime: string;
  employee: {
    id: string;
    name: string;
    department: string;
  };
  nextAction: AttendanceEventType;
  lastType: AttendanceEventType | null;
  lastTime: string | null;
  events: AttendanceEvent[];
  locationRequired: boolean;
  geofenceConfigured: boolean;
  radiusMeters: number | null;
};

const copy = {
  es: {
    title: "Mi fichaje",
    subtitle: "Debes estar en el restaurante y permitir la ubicación.",
    loading: "Cargando tu fichaje…",
    unavailable: "No se pudo cargar el sistema de fichaje.",
    entrance: "Entrada",
    exit: "Salida",
    nextEntrance: "Registrar entrada",
    nextExit: "Registrar salida",
    locating: "Comprobando ubicación…",
    sending: "Guardando fichaje…",
    ready: "Ubicación verificada",
    locationNeeded: "La ubicación se comprueba al pulsar el botón.",
    locationDenied:
      "Activa la ubicación para este sitio en los ajustes del navegador.",
    locationUnavailable:
      "No se pudo obtener una ubicación precisa. Acércate a una ventana y vuelve a intentar.",
    offline: "Necesitas conexión a internet para validar el fichaje.",
    success: "Fichaje registrado correctamente",
    today: "Fichajes de hoy",
    noEvents: "Todavía no has fichado hoy.",
    refresh: "Actualizar",
    logout: "Cerrar sesión",
    insideOnly: "Solo funciona dentro del restaurante",
    configMissing: "El administrador todavía no ha configurado la ubicación del restaurante.",
  },
  zh: {
    title: "Mi fichaje",
    subtitle: "Debes estar en el restaurante y permitir la ubicación.",
    loading: "Cargando tu fichaje…",
    unavailable: "No se pudo cargar el sistema de fichaje.",
    entrance: "Entrada",
    exit: "Salida",
    nextEntrance: "Registrar entrada",
    nextExit: "Registrar salida",
    locating: "Comprobando ubicación…",
    sending: "Guardando fichaje…",
    ready: "Ubicación verificada",
    locationNeeded: "La ubicación se comprueba al pulsar el botón.",
    locationDenied:
      "Activa la ubicación para este sitio en los ajustes del navegador.",
    locationUnavailable:
      "No se pudo obtener una ubicación precisa. Acércate a una ventana y vuelve a intentar.",
    offline: "Necesitas conexión a internet para validar el fichaje.",
    success: "Fichaje registrado correctamente",
    today: "Fichajes de hoy",
    noEvents: "Todavía no has fichado hoy.",
    refresh: "Actualizar",
    logout: "Cerrar sesión",
    insideOnly: "Solo funciona dentro del restaurante",
    configMissing: "El administrador todavía no ha configurado la ubicación del restaurante.",
  },
} as const;

function timeLabel(iso: string, locale: "es" | "zh") {
  void locale;
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function geolocationErrorMessage(
  error: Pick<GeolocationPositionError, "code">,
  text: (typeof copy)["es"] | (typeof copy)["zh"],
) {
  return error.code === 1
    ? text.locationDenied
    : text.locationUnavailable;
}

export default function MyAttendancePage() {
  const { user, logout } = useAuth();
  const { locale } = useLanguage();
  const text = copy[locale];
  const [data, setData] = useState<PersonalAttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [distance, setDistance] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/attendance/me", { cache: "no-store" });
      const payload = (await response.json()) as PersonalAttendancePayload & {
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
  }, [text.unavailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const punch = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    setDistance(null);

    if (!navigator.onLine) {
      setError(text.offline);
      setSubmitting(false);
      return;
    }
    if (!navigator.geolocation) {
      setError(text.locationUnavailable);
      setSubmitting(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
      });

      const response = await fetch("/api/attendance/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          deviceId: getKioskDeviceId(),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        event?: AttendanceEvent;
        distanceMeters?: number;
      };
      if (!response.ok || !result.event) {
        throw new Error(result.error ?? text.unavailable);
      }

      setDistance(result.distanceMeters ?? null);
      setMessage(
        `${text.success} · ${
          result.event.type === "in" ? text.entrance : text.exit
        } ${timeLabel(result.event.occurredAt, locale)}`,
      );
      await load();
    } catch (punchError) {
      if (
        typeof punchError === "object" &&
        punchError !== null &&
        "code" in punchError &&
        typeof punchError.code === "number"
      ) {
        setError(
          geolocationErrorMessage(
            punchError as Pick<GeolocationPositionError, "code">,
            text,
          ),
        );
      } else {
        setError(
          punchError instanceof Error ? punchError.message : text.unavailable,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nextIsIn = data?.nextAction !== "out";

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-5 text-white sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-karuma-300">Karuma ERP</p>
            <h1 className="text-2xl font-bold">{text.title}</h1>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl">
          <div className="bg-karuma-600 px-5 py-5 text-white">
            <p className="text-sm text-karuma-100">{data?.employee.department}</p>
            <h2 className="mt-1 text-2xl font-bold">
              {data?.employee.name ?? user?.name}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-karuma-50">
              <ShieldCheck className="h-4 w-4" />
              {text.insideOnly}
            </div>
          </div>

          <div className="space-y-4 p-5">
            {loading && !data ? (
              <div className="flex min-h-52 items-center justify-center text-sm text-gray-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                {text.loading}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    {data?.lastTime
                      ? `${data.lastType === "in" ? text.entrance : text.exit} · ${timeLabel(data.lastTime, locale)}`
                      : text.noEvents}
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-full ${
                        nextIsIn
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {nextIsIn ? (
                        <LogIn className="h-9 w-9" />
                      ) : (
                        <LogOut className="h-9 w-9" />
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">{text.subtitle}</p>
                </div>

                {!data?.geofenceConfigured && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {text.configMissing}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void punch()}
                  disabled={submitting || !data?.geofenceConfigured}
                  className={`flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-5 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                    nextIsIn
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {submitting ? (
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                  ) : (
                    <LocateFixed className="h-6 w-6" />
                  )}
                  {submitting
                    ? text.locating
                    : nextIsIn
                      ? text.nextEntrance
                      : text.nextExit}
                </button>

                <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {distance === null
                      ? text.locationNeeded
                      : `${text.ready} · ${Math.round(distance)} m`}
                  </span>
                </div>

                {message && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {message}
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error === text.offline ? (
                      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {error}
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Clock3 className="h-4 w-4" />
                      {text.today}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void load()}
                      disabled={loading}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                      />
                      {text.refresh}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(data?.events ?? []).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-gray-700">
                          {event.type === "in" ? text.entrance : text.exit}
                        </span>
                        <span className="font-mono text-gray-500">
                          {timeLabel(event.occurredAt, locale)}
                        </span>
                      </div>
                    ))}
                    {!loading && data?.events.length === 0 && (
                      <p className="py-3 text-center text-sm text-gray-400">
                        {text.noEvents}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => void logout()}
          className="mx-auto mt-5 flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {text.logout}
        </button>
      </div>
    </main>
  );
}
