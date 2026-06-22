"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { computeTodayAdminStats, ADMIN_PIN } from "@/lib/kiosk/admin";
import {
  KIOSK_DEPARTMENTS,
  employeesByDepartment,
  type KioskEmployee,
} from "@/lib/kiosk/employees";
import {
  formatPunchTimeShort,
  getEmployeeTodayStatus,
  getTodayPunchRecordsDesc,
  savePunchRecord,
  type PunchRecord,
  type PunchType,
} from "@/lib/kiosk/storage";

type SuccessState = {
  name: string;
  type: PunchType;
  time: string;
};

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

function renderEmployeeStatus(emp: KioskEmployee, locale: Locale, t: (k: string) => string) {
  const status = getEmployeeTodayStatus(emp.id, locale);
  if (status.state === "none") return t("kiosk.statusNone");
  if (status.state === "in") return `${t("kiosk.statusIn")} ${status.time}`;
  return `${t("kiosk.statusOut")} ${status.time}`;
}

const ADMIN_ROLES = new Set(["owner", "manager"]);

export default function KioskPage() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const [selected, setSelected] = useState<KioskEmployee | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const { dateStr, timeStr } = useLiveClock(locale);

  const refreshRecords = useCallback(() => {
    setRecords(getTodayPunchRecordsDesc());
  }, []);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2000);
    return () => window.clearTimeout(id);
  }, [success]);

  const closeModal = () => {
    setSelected(null);
    setPin("");
    setPinError("");
  };

  const closeAdmin = () => {
    setAdminOpen(false);
    setAdminPin("");
    setAdminPinError("");
    setAdminUnlocked(false);
  };

  const submitAdminPin = () => {
    if (adminPin !== ADMIN_PIN) {
      setAdminPinError(t("kiosk.pinError"));
      return;
    }
    setAdminPinError("");
    setAdminUnlocked(true);
  };

  const submit = (type: PunchType) => {
    if (!selected) return;
    if (pin !== selected.pin) {
      setPinError(t("kiosk.pinError"));
      return;
    }
    const at = new Date();
    const record = savePunchRecord(selected.id, selected.name, type, at);
    refreshRecords();
    setSuccess({
      name: record.employeeName,
      type: record.type,
      time: formatPunchTimeShort(at.toISOString(), locale),
    });
    closeModal();
  };

  const adminStats = adminUnlocked ? computeTodayAdminStats() : null;

  const deptSubtitle = (deptId: string) =>
    deptId === "Sala" ? t("kiosk.deptSala") : t("kiosk.deptCocina");

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
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-karuma-200 bg-karuma-50 px-3 py-2 text-sm font-medium text-karuma-700 shadow-sm hover:bg-karuma-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Panel ERP
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setAdminOpen(true);
                setAdminPin("");
                setAdminPinError("");
                setAdminUnlocked(false);
              }}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {t("kiosk.admin")}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        {KIOSK_DEPARTMENTS.map((dept) => {
          const rows = employeesByDepartment(dept.id);
          return (
            <section
              key={dept.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">
                {dept.titleZh} / {deptSubtitle(dept.id)}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {rows.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setSelected(emp);
                      setPin("");
                      setPinError("");
                    }}
                    className="inline-flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span>{emp.name}</span>
                    <span className="text-xs font-normal text-gray-500">
                      {renderEmployeeStatus(emp, locale, t)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("kiosk.todayLog")}</h3>
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">{t("kiosk.noRecords")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">{t("kiosk.colEmployee")}</th>
                  <th className="px-3 py-2">{t("kiosk.colType")}</th>
                  <th className="px-3 py-2">{t("kiosk.colTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2 font-medium text-gray-900">{r.employeeName}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.type === "in" ? t("kiosk.typeIn") : t("kiosk.typeOut")}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {formatPunchTimeShort(r.timestamp, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </footer>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <p className="text-sm text-gray-500">{t("kiosk.colEmployee")}</p>
            <h2 className="text-center text-xl font-bold text-gray-900">{selected.name}</h2>
            <p className="mt-4 text-sm text-gray-500">{t("kiosk.pinLabel")}</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              placeholder={t("kiosk.pinPlaceholder")}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-xl tracking-widest text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
            />
            {pinError && <p className="mt-2 text-center text-sm text-red-600">{pinError}</p>}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => submit("in")}
                className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t("kiosk.clockIn")}
              </button>
              <button
                type="button"
                onClick={() => submit("out")}
                className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700"
              >
                {t("kiosk.clockOut")}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("kiosk.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-center text-xl font-bold text-gray-900">{t("kiosk.adminTitle")}</h2>
            {!adminUnlocked ? (
              <>
                <p className="mt-4 text-sm text-gray-500">{t("kiosk.pinLabel")}</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={adminPin}
                  placeholder={t("kiosk.adminPinPlaceholder")}
                  onChange={(e) => {
                    setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setAdminPinError("");
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-xl tracking-widest text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                />
                {adminPinError && (
                  <p className="mt-2 text-center text-sm text-red-600">{adminPinError}</p>
                )}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={submitAdminPin}
                    className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg bg-karuma-600 py-3 text-sm font-semibold text-white hover:bg-karuma-700"
                  >
                    {t("kiosk.adminTitle")}
                  </button>
                  <button
                    type="button"
                    onClick={closeAdmin}
                    className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t("kiosk.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{t("kiosk.adminPresent")}</p>
                  <p className="mt-1 text-gray-600">
                    {adminStats!.present.length > 0 ? adminStats!.present.join("、") : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t("kiosk.adminAbsent")}</p>
                  <p className="mt-1 text-gray-600">
                    {adminStats!.absent.length > 0 ? adminStats!.absent.join("、") : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t("kiosk.adminLate")}</p>
                  <p className="mt-1 text-gray-600">
                    {adminStats!.late.length > 0 ? adminStats!.late.join("、") : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAdmin}
                  className="inline-flex w-full min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("kiosk.adminClose")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-lg">
          <p className="text-lg font-bold text-emerald-900">✅ {t("kiosk.punchSuccess")}</p>
          <p className="mt-2 text-sm text-emerald-800">
            {t("kiosk.successEmployee")}: {success.name}
          </p>
          <p className="text-sm text-emerald-800">
            {t("kiosk.successType")}:{" "}
            {success.type === "in" ? t("kiosk.typeIn") : t("kiosk.typeOut")}
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-emerald-900">
            {t("kiosk.successTime")}: {success.time}
          </p>
        </div>
      )}
    </div>
  );
}
