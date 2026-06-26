"use client";

import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { scheduleRows } from "@/lib/staff-mock/data";
import { SHIFT_HOURS, SHIFT_ORDER, shiftLabelKey, shiftVariant } from "@/lib/schedule/shifts";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatDate } from "@/lib/utils";

export function SchedulePanel() {
  const { t } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.schedule.description")} hideTitle />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SHIFT_ORDER.map((type) => (
          <div
            key={type}
            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <StatusBadge variant={shiftVariant(type)}>{t(shiftLabelKey(type))}</StatusBadge>
            <p className="mt-2 whitespace-pre-line text-xs text-gray-600 sm:text-sm">
              {SHIFT_HOURS[type] === "—" ? t("pages.schedule.noHours") : SHIFT_HOURS[type]}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.schedule.employee")}</th>
                <th className="px-4 py-3">{t("pages.schedule.date")}</th>
                <th className="px-4 py-3">{t("pages.schedule.shift")}</th>
                <th className="px-4 py-3">{t("pages.schedule.hours")}</th>
                <th className="px-4 py-3">{t("pages.schedule.position")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scheduleRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    {row.empleado}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={shiftVariant(row.turno)}>
                      {t(shiftLabelKey(row.turno))}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-pre-line px-4 py-3.5 text-gray-600">
                    {SHIFT_HOURS[row.turno] === "—"
                      ? t("pages.schedule.noHours")
                      : SHIFT_HOURS[row.turno]}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{row.puesto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContent>
  );
}
