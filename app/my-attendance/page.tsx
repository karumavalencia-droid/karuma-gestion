"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import type {
  AttendanceCorrection,
  AttendanceEvent,
  AttendanceEventType,
} from "@/lib/attendance/types";
import {
  createAttendanceRequestId,
  getKioskDeviceId,
} from "@/lib/kiosk/offline";
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

type ColleagueAttendance = {
  employeeId: string;
  employeeName: string;
  department: string;
  lastType: "in" | "out" | null;
  lastTime: string | null;
};

type ColleaguesPayload = {
  businessDate: string;
  myDepartment: string;
  colleagues: ColleagueAttendance[];
};

type AttendanceHistoryDay = {
  date: string;
  status: "present" | "missing" | "off";
  planned: boolean;
  scheduleLabel: string;
  eventCount: number;
  firstIn: string | null;
  lastOut: string | null;
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
    correctionTitle: "¿Te falta un fichaje?",
    correctionHelp: "Solicita una corrección y tu responsable la revisará.",
    correctionReason: "Motivo",
    correctionSubmit: "Enviar solicitud",
    correctionSent: "Solicitud enviada",
    correctionPending: "Pendiente",
    correctionApproved: "Aprobada",
    correctionRejected: "Rechazada",
    historyTitle: "Histórico de asistencia",
    historyHelp: "Vista mensual de los últimos 31 días según tu horario.",
    historyPresent: "Con fichaje",
    historyMissing: "Sin fichaje",
    historyOff: "Descanso / sin turno",
    historyEvents: "fichajes",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    noHistory: "Sin datos para este día",
  },
  zh: {
    title: "我的打卡",
    subtitle: "请在餐厅内并允许浏览器使用定位。",
    loading: "正在加载打卡记录…",
    unavailable: "暂时无法连接打卡系统。",
    entrance: "上班",
    exit: "下班",
    nextEntrance: "登记上班",
    nextExit: "登记下班",
    locating: "正在确认位置…",
    sending: "正在保存打卡…",
    ready: "位置已确认",
    locationNeeded: "点击按钮后才会检查位置。",
    locationDenied: "请在浏览器设置中允许此网站使用位置。",
    locationUnavailable: "无法取得准确位置。请靠近窗边后重试。",
    offline: "需要联网才能验证打卡。",
    success: "打卡成功",
    today: "今天的打卡记录",
    noEvents: "今天还没有打卡记录。",
    refresh: "刷新",
    logout: "退出登录",
    insideOnly: "仅限在餐厅内使用",
    configMissing: "管理员尚未配置餐厅位置。",
    correctionTitle: "漏打卡？",
    correctionHelp: "提交更正申请，负责人审核后会补入记录。",
    correctionReason: "原因",
    correctionSubmit: "提交申请",
    correctionSent: "申请已提交",
    correctionPending: "待审核",
    correctionApproved: "已通过",
    correctionRejected: "已拒绝",
    historyTitle: "考勤历史",
    historyHelp: "按月查看最近 31 天的排班和打卡。",
    historyPresent: "已打卡",
    historyMissing: "没有打卡",
    historyOff: "休息 / 无排班",
    historyEvents: "次打卡",
    previousMonth: "上个月",
    nextMonth: "下个月",
    noHistory: "当天暂无数据",
  },
} as const;

const spanishWeekdays = ["L", "M", "X", "J", "V", "S", "D"];
const chineseWeekdays = ["一", "二", "三", "四", "五", "六", "日"];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthCalendarDates(value: string): Array<string | null> {
  const [year, month] = value.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${value}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

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

function getCurrentPositionWithRetry(): Promise<GeolocationPosition> {
  const locate = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  return locate({ enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 })
    .catch((error) => {
      // Indoors, a fresh GPS fix may time out even though a recent network
      // location is accurate enough for the server-side geofence.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === 2 || error.code === 3)
      ) {
        return locate({
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      }
      throw error;
    });
}

export default function MyAttendancePage() {
  const { user, logout } = useAuth();
  const { locale } = useLanguage();
  const text = copy[locale];
  const [data, setData] = useState<PersonalAttendancePayload | null>(null);
  const [colleagues, setColleagues] = useState<ColleagueAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [correctionType, setCorrectionType] = useState<AttendanceEventType>("in");
  const [correctionAt, setCorrectionAt] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionSending, setCorrectionSending] = useState(false);
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [displayedMonth, setDisplayedMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
    }).format(new Date()),
  );
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceRes, colleaguesRes, historyRes] = await Promise.all([
        fetch("/api/attendance/me", { cache: "no-store" }),
        fetch("/api/attendance/colleagues", { cache: "no-store" }),
        fetch("/api/attendance/me/history?days=31", { cache: "no-store" }),
      ]);

      const payload = (await attendanceRes.json()) as PersonalAttendancePayload & {
        error?: string;
      };
      if (!attendanceRes.ok) throw new Error(payload.error ?? text.unavailable);
      setData(payload);

      if (historyRes.ok) {
        const historyPayload = (await historyRes.json()) as { days?: AttendanceHistoryDay[] };
        const historyDays = historyPayload.days ?? [];
        setHistory(historyDays);
        if (historyDays[0]) {
          setDisplayedMonth(monthKey(historyDays[0].date));
          setSelectedHistoryDate((current) => current ?? historyDays[0].date);
        }
      }

      const correctionsRes = await fetch("/api/attendance/corrections", { cache: "no-store" });
      if (correctionsRes.ok) {
        const correctionsPayload = (await correctionsRes.json()) as { requests?: AttendanceCorrection[] };
        setCorrections(correctionsPayload.requests ?? []);
      }

      if (colleaguesRes.ok) {
        const colleaguesData = (await colleaguesRes.json()) as ColleaguesPayload;
        setColleagues(colleaguesData.colleagues);
      }

      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : text.unavailable,
      );
    } finally {
      setLoading(false);
    }
  }, [text.unavailable]);

  const submitCorrection = async () => {
    if (correctionSending || !correctionAt || correctionReason.trim().length < 3) return;
    setCorrectionSending(true);
    setError("");
    try {
      const response = await fetch("/api/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: correctionType,
          occurredAt: new Date(correctionAt).toISOString(),
          reason: correctionReason.trim(),
        }),
      });
      const result = (await response.json()) as { correction?: AttendanceCorrection; error?: string };
      if (!response.ok || !result.correction) throw new Error(result.error ?? text.unavailable);
      setCorrections((current) => [result.correction!, ...current]);
      setCorrectionReason("");
      setMessage(text.correctionSent);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : text.unavailable);
    } finally {
      setCorrectionSending(false);
    }
  };

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
      const position = await getCurrentPositionWithRetry();

      const response = await fetch("/api/attendance/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: createAttendanceRequestId(),
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
      setData((current) => current ? {
        ...current,
        serverTime: result.event!.occurredAt,
        nextAction: result.event!.type === "in" ? "out" : "in",
        lastType: result.event!.type,
        lastTime: result.event!.occurredAt,
        events: [...current.events, result.event!],
      } : current);
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

  const historyByDate = useMemo(
    () => new Map(history.map((day) => [day.date, day])),
    [history],
  );
  const calendarDates = useMemo(
    () => monthCalendarDates(displayedMonth),
    [displayedMonth],
  );
  const selectedHistory = selectedHistoryDate
    ? historyByDate.get(selectedHistoryDate) ?? null
    : null;
  const availableMonths = useMemo(
    () => [...new Set(history.map((day) => monthKey(day.date)))].sort(),
    [history],
  );
  const monthTitle = new Date(`${displayedMonth}-01T12:00:00Z`).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "es-ES",
    { month: "long", year: "numeric", timeZone: "Europe/Madrid" },
  );
  const showMonth = (offset: number) => {
    const targetMonth = shiftMonth(displayedMonth, offset);
    setDisplayedMonth(targetMonth);
    setSelectedHistoryDate(
      history.find((day) => monthKey(day.date) === targetMonth)?.date ?? null,
    );
  };

  const historyDateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === "zh" ? "zh-CN" : "es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/Madrid",
    });

  const historyTimeLabel = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        })
      : "—";

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-5 pb-24 text-white sm:py-8">
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
                      <Users className="h-4 w-4" />
                      Compañeros ({colleagues.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {colleagues.length === 0 ? (
                      <p className="py-3 text-center text-sm text-gray-400">
                        Sin compañeros en el turno hoy
                      </p>
                    ) : (
                      colleagues.map((colleague) => (
                        <div
                          key={colleague.employeeId}
                          className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 text-sm"
                        >
                          <div>
                            <div className="font-medium text-gray-700">
                              {colleague.employeeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {colleague.lastTime
                                ? `${colleague.lastType === "in" ? text.entrance : text.exit} · ${timeLabel(colleague.lastTime, locale)}`
                                : "Sin fichar"}
                            </div>
                          </div>
                          <div
                            className={`flex h-2.5 w-2.5 rounded-full ${
                              colleague.lastType === "in"
                                ? "bg-emerald-500"
                                : colleague.lastType === "out"
                                  ? "bg-amber-500"
                                  : "bg-gray-300"
                            }`}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

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

                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">{text.correctionTitle}</h3>
                  <p className="mt-1 text-xs text-gray-500">{text.correctionHelp}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select
                      value={correctionType}
                      onChange={(event) => setCorrectionType(event.target.value as AttendanceEventType)}
                      className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="in">{text.entrance}</option>
                      <option value="out">{text.exit}</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={correctionAt}
                      onChange={(event) => setCorrectionAt(event.target.value)}
                      className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    />
                  </div>
                  <input
                    value={correctionReason}
                    onChange={(event) => setCorrectionReason(event.target.value)}
                    placeholder={text.correctionReason}
                    maxLength={500}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void submitCorrection()}
                    disabled={correctionSending || !correctionAt || correctionReason.trim().length < 3}
                    className="mt-2 min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {correctionSending ? text.sending : text.correctionSubmit}
                  </button>
                  {corrections.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      {corrections.slice(0, 3).map((correction) => (
                        <div key={correction.id} className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2">
                          <span>{correction.type === "in" ? text.entrance : text.exit} · {correction.businessDate}</span>
                          <span className="font-medium">
                            {correction.status === "pending" ? text.correctionPending : correction.status === "approved" ? text.correctionApproved : text.correctionRejected}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Clock3 className="h-4 w-4" />
                        {text.historyTitle}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">{text.historyHelp}</p>
                    </div>
                    <div className="text-right text-[11px] text-gray-500">
                      <div>{text.historyPresent}: {history.filter((day) => day.status === "present").length}</div>
                      <div className="text-red-600">{text.historyMissing}: {history.filter((day) => day.status === "missing").length}</div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
                      <button
                        type="button"
                        aria-label={text.previousMonth}
                        disabled={!availableMonths.includes(shiftMonth(displayedMonth, -1))}
                        onClick={() => showMonth(-1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-25"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <h4 className="capitalize text-base font-bold text-gray-900">{monthTitle}</h4>
                      <button
                        type="button"
                        aria-label={text.nextMonth}
                        disabled={!availableMonths.includes(shiftMonth(displayedMonth, 1))}
                        onClick={() => showMonth(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-25"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-gray-100 px-2 py-2">
                      {(locale === "zh" ? chineseWeekdays : spanishWeekdays).map((weekday) => (
                        <div key={weekday} className="text-center text-[11px] font-semibold text-gray-400">
                          {weekday}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 p-2">
                      {calendarDates.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
                        const day = historyByDate.get(date);
                        const selected = selectedHistoryDate === date;
                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={!day}
                            onClick={() => setSelectedHistoryDate(date)}
                            className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                              selected
                                ? "bg-gray-900 font-bold text-white"
                                : day
                                  ? "text-gray-800 hover:bg-gray-100"
                                  : "text-gray-300"
                            }`}
                          >
                            <span>{Number(date.slice(-2))}</span>
                            {day && (
                              <span
                                className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                                  day.status === "present"
                                    ? "bg-emerald-500"
                                    : day.status === "missing"
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />{text.historyPresent}</span>
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />{text.historyMissing}</span>
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gray-300" />{text.historyOff}</span>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl bg-gray-50 px-3 py-3 text-sm">
                    {selectedHistory ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-800">{historyDateLabel(selectedHistory.date)}</span>
                          <span className={`text-xs font-semibold ${selectedHistory.status === "missing" ? "text-red-600" : selectedHistory.status === "present" ? "text-emerald-700" : "text-gray-500"}`}>
                            {selectedHistory.status === "present" ? text.historyPresent : selectedHistory.status === "missing" ? text.historyMissing : text.historyOff}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                          <span>{selectedHistory.planned ? `${historyTimeLabel(selectedHistory.firstIn)} – ${historyTimeLabel(selectedHistory.lastOut)}` : selectedHistory.scheduleLabel}</span>
                          {selectedHistory.eventCount > 0 && <span>{selectedHistory.eventCount} {text.historyEvents}</span>}
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-xs text-gray-400">{text.noHistory}</p>
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
      <PortalTabs />
    </main>
  );
}
