"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  CloudOff,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type {
  AttendanceEmployeeStatus,
  AttendanceEvent,
  AttendanceEventType,
  PendingPunch,
} from "@/lib/attendance/types";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getKioskDeviceId,
  listPendingPunches,
  queuePendingPunch,
  removePendingPunch,
} from "@/lib/kiosk/offline";

type KioskPayload = {
  businessDate: string;
  serverTime: string;
  employees: AttendanceEmployeeStatus[];
};

type SuccessState = {
  name: string;
  type: AttendanceEventType;
  time: string;
  queued: boolean;
};

const ADMIN_ROLES = new Set(["owner", "manager"]);
const STATUS_CACHE_KEY = "karuma-kiosk-status-cache-v1";

const copy = {
  es: {
    online: "Conectado",
    offline: "Sin conexión",
    synced: "Todo sincronizado",
    pending: "pendiente(s) de sincronizar",
    retry: "Sincronizar",
    loading: "Cargando fichaje…",
    unavailable: "No se pudo conectar con el sistema de fichaje.",
    queued: "Guardado en la tablet. Se enviará al recuperar internet.",
    nextIn: "Siguiente: Entrada",
    nextOut: "Siguiente: Salida",
    confirmIn: "Registrar entrada",
    confirmOut: "Registrar salida",
    syncing: "Sincronizando…",
    success: "Fichaje realizado",
    queuedTitle: "Fichaje pendiente",
    lastIn: "Entrada",
    lastOut: "Salida",
    never: "Sin fichar",
  },
  zh: {
    online: "已联网",
    offline: "网络断开",
    synced: "已全部同步",
    pending: "条等待同步",
    retry: "同步",
    loading: "正在加载打卡…",
    unavailable: "无法连接打卡系统。",
    queued: "已保存在平板，恢复网络后自动上传。",
    nextIn: "下一步：上班",
    nextOut: "下一步：下班",
    confirmIn: "确认上班",
    confirmOut: "确认下班",
    syncing: "同步中…",
    success: "打卡成功",
    queuedTitle: "打卡等待同步",
    lastIn: "上班",
    lastOut: "下班",
    never: "未打卡",
  },
} as const;

function useLiveClock(locale: Locale) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const dateLocale = locale === "zh" ? "zh-CN" : "es-ES";
  return {
    dateStr: now.toLocaleDateString(dateLocale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeStr: now.toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function shortTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale === "zh" ? "zh-CN" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function applyPendingPunches(
  employees: AttendanceEmployeeStatus[],
  pending: PendingPunch[],
): AttendanceEmployeeStatus[] {
  return employees.map((employee) => {
    const rows = pending.filter((row) => row.employeeId === employee.employeeId);
    if (rows.length === 0) return { ...employee, pendingCount: 0 };
    const last = rows.at(-1)!;
    return {
      ...employee,
      lastType: last.type,
      lastTime: last.clientOccurredAt,
      nextAction: last.type === "in" ? "out" : "in",
      pendingCount: rows.length,
    };
  });
}

async function postPunch(punch: PendingPunch) {
  return fetch("/api/attendance/kiosk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...punch,
      offline: true,
      deviceId: getKioskDeviceId(),
    }),
  });
}

export default function KioskPage() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const c = copy[locale];
  const [employees, setEmployees] = useState<AttendanceEmployeeStatus[]>([]);
  const [pending, setPending] = useState<PendingPunch[]>([]);
  const [selected, setSelected] = useState<AttendanceEmployeeStatus | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const { dateStr, timeStr } = useLiveClock(locale);

  const visibleEmployees = useMemo(
    () => applyPendingPunches(employees, pending),
    [employees, pending],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/attendance/kiosk", { cache: "no-store" });
      if (!response.ok) throw new Error("attendance unavailable");
      const payload = (await response.json()) as KioskPayload;
      setEmployees(payload.employees);
      localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(payload.employees));
      setError("");
    } catch {
      try {
        const cached = JSON.parse(
          localStorage.getItem(STATUS_CACHE_KEY) ?? "[]",
        ) as AttendanceEmployeeStatus[];
        if (Array.isArray(cached) && cached.length > 0) setEmployees(cached);
      } catch {
        // Ignore malformed local cache; the error message remains visible.
      }
      setError(c.unavailable);
    } finally {
      setLoading(false);
    }
  }, [c.unavailable]);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await listPendingPunches());
    } catch {
      setPending([]);
    }
  }, []);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const rows = await listPendingPunches();
      for (const row of rows) {
        const response = await postPunch(row);
        if (response.ok || [400, 401, 409, 429].includes(response.status)) {
          await removePendingPunch(row.requestId);
        } else {
          break;
        }
      }
      await refreshPending();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh, refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshPending().then(() => refresh()).then(() => syncPending());
    const onOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh, refreshPending, syncPending]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(id);
  }, [success]);

  const closeModal = () => {
    setSelected(null);
    setPin("");
    setError("");
  };

  const submit = async () => {
    if (!selected || pin.length !== 4 || submitting) return;
    setSubmitting(true);
    setError("");
    const action = selected.nextAction;
    const clientOccurredAt = new Date().toISOString();
    const punch: PendingPunch = {
      requestId: crypto.randomUUID(),
      employeeId: selected.employeeId,
      pin,
      type: action,
      clientOccurredAt,
      queuedAt: clientOccurredAt,
    };
    try {
      if (!navigator.onLine) {
        await queuePendingPunch(punch);
        await refreshPending();
        setSuccess({
          name: selected.employeeName,
          type: action,
          time: shortTime(clientOccurredAt, locale),
          queued: true,
        });
        closeModal();
        return;
      }
      const response = await fetch("/api/attendance/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...punch,
          offline: false,
          deviceId: getKioskDeviceId(),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        event?: AttendanceEvent;
      };
      if (!response.ok || !result.event) {
        setError(result.error ?? c.unavailable);
        return;
      }
      setSuccess({
        name: selected.employeeName,
        type: action,
        time: shortTime(result.event.occurredAt, locale),
        queued: false,
      });
      closeModal();
      await refresh();
    } catch {
      await queuePendingPunch(punch);
      await refreshPending();
      setSuccess({
        name: selected.employeeName,
        type: action,
        time: shortTime(clientOccurredAt, locale),
        queued: true,
      });
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const departments = ["Sala", "Cocina"] as const;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col p-3 sm:p-4 md:p-6">
      <header className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-karuma-600">{t("kiosk.brand")}</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("kiosk.title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{dateStr}</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-gray-900 sm:text-4xl">
              {timeStr}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
            {isAdmin && (
              <Link
                href="/attendance"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-karuma-200 bg-karuma-50 px-3 py-2 text-sm font-medium text-karuma-700 shadow-sm hover:bg-karuma-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Asistencia
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
            online
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          <span className="flex items-center gap-2">
            {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            {online ? c.online : c.offline}
            <span className="text-xs opacity-80">
              {pending.length === 0 ? c.synced : `${pending.length} ${c.pending}`}
            </span>
          </span>
          {pending.length > 0 && online && (
            <button
              type="button"
              onClick={() => void syncPending()}
              disabled={syncing}
              className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-medium disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? c.syncing : c.retry}
            </button>
          )}
        </div>
      </header>

      {loading && employees.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-gray-500">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          {c.loading}
        </div>
      ) : (
        <main className="flex flex-1 flex-col gap-4">
          {departments.map((department) => (
            <section
              key={department}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
                {department} / {department === "Sala" ? t("kiosk.deptSala") : t("kiosk.deptCocina")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {visibleEmployees
                  .filter((employee) => employee.department === department)
                  .map((employee) => (
                    <button
                      key={employee.employeeId}
                      type="button"
                      onClick={() => {
                        setSelected(employee);
                        setPin("");
                        setError("");
                      }}
                      className={`inline-flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold shadow-sm active:scale-[0.98] ${
                        employee.lastType === "in"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <span>{employee.employeeName}</span>
                      <span className="text-xs font-normal opacity-75">
                        {!employee.lastType
                          ? c.never
                          : `${employee.lastType === "in" ? c.lastIn : c.lastOut} ${shortTime(employee.lastTime, locale)}`}
                      </span>
                      <span className="text-[11px] font-medium text-karuma-600">
                        {employee.nextAction === "in" ? c.nextIn : c.nextOut}
                      </span>
                      {(employee.pendingCount ?? 0) > 0 && (
                        <span className="text-[10px] font-medium text-amber-700">
                          {employee.pendingCount} {c.pending}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </main>
      )}

      {error && !selected && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <p className="text-sm text-gray-500">{t("kiosk.colEmployee")}</p>
            <h2 className="text-center text-xl font-bold text-gray-900">
              {selected.employeeName}
            </h2>
            <p className="mt-1 text-center text-sm font-medium text-karuma-600">
              {selected.nextAction === "in" ? c.nextIn : c.nextOut}
            </p>
            <p className="mt-4 text-sm text-gray-500">{t("kiosk.pinLabel")}</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              placeholder={t("kiosk.pinPlaceholder")}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-xl tracking-widest text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
            />
            {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={pin.length !== 4 || submitting}
                className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-lg py-3 text-base font-semibold text-white disabled:opacity-50 ${
                  selected.nextAction === "in"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submitting && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
                {selected.nextAction === "in" ? c.confirmIn : c.confirmOut}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("kiosk.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className={`fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm rounded-xl border p-4 text-center shadow-lg ${
          success.queued
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          <p className="text-lg font-bold">
            {success.queued ? c.queuedTitle : `✅ ${c.success}`}
          </p>
          <p className="mt-1 text-sm">
            {success.name} · {success.type === "in" ? c.lastIn : c.lastOut} · {success.time}
          </p>
          {success.queued && <p className="mt-1 text-xs">{c.queued}</p>}
        </div>
      )}
    </div>
  );
}
