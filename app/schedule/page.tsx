"use client";

import { useMemo, useState } from "react";
import { ErpPageIntro } from "@/components/layout/ErpPageIntro";
import { PageContent } from "@/components/layout/PageContent";
import { weekDayLabel } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getCurrentWeekContext } from "@/lib/schedule/current-week";
import { SCHEDULE_DEPARTMENTS, WEEK_DAYS, type ScheduleDepartment } from "@/lib/schedule/constants";
import { formatDayTimesInline, isWorkingSchedule } from "@/lib/schedule/display";
import { formatHours, formatTimeRange } from "@/lib/schedule/hours";
import { EMPLOYEE_SCHEDULES, calcWeekHours } from "@/lib/schedule/mock";
import type { DaySchedule, EmployeeSchedule } from "@/lib/schedule/types";
import { getTodayWeekDay } from "@/lib/schedule/utils";

type ViewMode = "today" | "week";

function rowsForDept(dept: ScheduleDepartment) {
  return EMPLOYEE_SCHEDULES.filter((r) => r.department === dept);
}

function ViewTabs({
  mode,
  onChange,
  todayLabel,
  weekLabel,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  todayLabel: string;
  weekLabel: string;
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
      {(
        [
          { id: "today" as const, label: todayLabel },
          { id: "week" as const, label: weekLabel },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            mode === tab.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TodaySummaryBar({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-2.5">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className="text-[10px] leading-tight text-gray-500">{item.label}</p>
          <p className="mt-0.5 text-lg font-bold text-gray-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function CompactWorkRow({ name, day }: { name: string; day: DaySchedule }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="shrink-0 text-sm font-semibold text-gray-900">{name}</span>
      <span className="text-right text-[11px] leading-snug text-gray-500">
        {formatDayTimesInline(day)}
      </span>
    </div>
  );
}

function MobileTodayDepartment({
  deptTitle,
  deptSubtitle,
  rows,
  today,
  workingLabel,
  restPrefix,
}: {
  deptTitle: string;
  deptSubtitle: string;
  rows: EmployeeSchedule[];
  today: (typeof WEEK_DAYS)[number];
  workingLabel: (w: number, r: number) => string;
  restPrefix: string;
}) {
  const working = rows.filter((r) => isWorkingSchedule(r.days[today]));
  const resting = rows.filter((r) => !isWorkingSchedule(r.days[today]));

  return (
    <section className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 pb-1.5">
        <h2 className="text-sm font-semibold text-gray-900">
          {deptTitle}
          <span className="mx-1 font-normal text-gray-400">/</span>
          <span className="font-medium text-gray-700">{deptSubtitle}</span>
        </h2>
        <span className="shrink-0 text-[11px] text-gray-500">
          {workingLabel(working.length, resting.length)}
        </span>
      </div>

      {working.length > 0 && (
        <div className="divide-y divide-gray-50 pt-0.5">
          {working.map((row) => (
            <CompactWorkRow key={row.id} name={row.name} day={row.days[today]} />
          ))}
        </div>
      )}

      {resting.length > 0 && (
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
          {restPrefix}
          <span className="text-gray-700">{resting.map((r) => r.name).join("、")}</span>
        </p>
      )}
    </section>
  );
}

function DayCell({ day, restLabel }: { day: DaySchedule; restLabel: string }) {
  if (day.type === "rest" || day.type === "leave") {
    return (
      <td className="bg-gray-50 px-2 py-3 text-center text-sm text-gray-500">{restLabel}</td>
    );
  }
  return (
    <td className="px-2 py-3 text-center">
      <div className="flex flex-col gap-0.5">
        {day.segments.map((seg) => (
          <span key={`${seg.start}-${seg.end}`} className="text-xs font-medium text-gray-900">
            {formatTimeRange(seg)}
          </span>
        ))}
      </div>
    </td>
  );
}

function DepartmentWeekTable({
  title,
  subtitle,
  rows,
  weekDates,
  dayLabels,
  colEmployee,
  colWeekHours,
  restLabel,
}: {
  title: string;
  subtitle: string;
  rows: EmployeeSchedule[];
  weekDates: Record<(typeof WEEK_DAYS)[number], string>;
  dayLabels: Record<(typeof WEEK_DAYS)[number], string>;
  colEmployee: string;
  colWeekHours: string;
  restLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          {title}
          <span className="mx-2 font-normal text-gray-400">/</span>
          <span className="font-medium text-gray-700">{subtitle}</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3">{colEmployee}</th>
              {WEEK_DAYS.map((day) => (
                <th key={day} className="px-2 py-3 text-center">
                  <span className="block">{dayLabels[day]}</span>
                  <span className="mt-0.5 block font-normal normal-case text-gray-400">
                    {weekDates[day]}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-right">{colWeekHours}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/60">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-900">
                  {row.name}
                </td>
                {WEEK_DAYS.map((day) => (
                  <DayCell key={day} day={row.days[day]} restLabel={restLabel} />
                ))}
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatHours(calcWeekHours(row.days))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DesktopTodayDepartment({
  deptTitle,
  deptSubtitle,
  rows,
  today,
  workingLabel,
  restPrefix,
}: {
  deptTitle: string;
  deptSubtitle: string;
  rows: EmployeeSchedule[];
  today: (typeof WEEK_DAYS)[number];
  workingLabel: (w: number, r: number) => string;
  restPrefix: string;
}) {
  const working = rows.filter((r) => isWorkingSchedule(r.days[today]));
  const resting = rows.filter((r) => !isWorkingSchedule(r.days[today]));

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {deptTitle} / {deptSubtitle}
        </h2>
        <span className="text-sm text-gray-500">{workingLabel(working.length, resting.length)}</span>
      </div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        {working.map((row) => (
          <CompactWorkRow key={row.id} name={row.name} day={row.days[today]} />
        ))}
      </div>
      {resting.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          {restPrefix}
          <span className="text-gray-800">{resting.map((r) => r.name).join("、")}</span>
        </p>
      )}
    </section>
  );
}

export default function SchedulePage() {
  const { locale, t } = useLanguage();
  const [view, setView] = useState<ViewMode>("today");
  const currentWeek = useMemo(() => getCurrentWeekContext(), []);
  const today = useMemo(() => getTodayWeekDay(), []);

  const salaRows = rowsForDept("Sala");
  const cocinaRows = rowsForDept("Cocina");

  const salaWorking = salaRows.filter((r) => isWorkingSchedule(r.days[today]));
  const cocinaWorking = cocinaRows.filter((r) => isWorkingSchedule(r.days[today]));
  const allWorking = [...salaWorking, ...cocinaWorking];
  const allResting = EMPLOYEE_SCHEDULES.filter((r) => !isWorkingSchedule(r.days[today]));

  const dayLabels = Object.fromEntries(
    WEEK_DAYS.map((d) => [d, weekDayLabel(locale, d)]),
  ) as Record<(typeof WEEK_DAYS)[number], string>;

  const deptSubtitle = (id: ScheduleDepartment) =>
    id === "Sala" ? t("schedule.deptSala") : t("schedule.deptCocina");

  const workingCountLabel = (w: number, r: number) =>
    `${t("schedule.workingCount").replace("{n}", String(w))}｜${t("schedule.restingCount").replace("{n}", String(r))}`;

  const summaryItems = [
    { label: t("schedule.summaryTotal"), value: allWorking.length },
    { label: t("schedule.summarySala"), value: salaWorking.length },
    { label: t("schedule.summaryCocina"), value: cocinaWorking.length },
    { label: t("schedule.summaryRest"), value: allResting.length },
  ];

  return (
    <PageContent>
      <ErpPageIntro
        lead={`${t("schedule.today")} · ${dayLabels[today]} ${currentWeek.dates[today]}`}
        description={t("schedule.description")}
      />

      <div className="space-y-2.5 lg:hidden">
        <TodaySummaryBar items={summaryItems} />

        {SCHEDULE_DEPARTMENTS.map((dept) => (
          <MobileTodayDepartment
            key={dept.id}
            deptTitle={dept.title}
            deptSubtitle={deptSubtitle(dept.id)}
            rows={rowsForDept(dept.id)}
            today={today}
            workingLabel={workingCountLabel}
            restPrefix={t("schedule.restLabel")}
          />
        ))}
      </div>

      <div className="hidden space-y-4 lg:block">
        <ViewTabs
          mode={view}
          onChange={setView}
          todayLabel={t("schedule.today")}
          weekLabel={t("schedule.thisWeek")}
        />

        {view === "today" ? (
          <>
            <TodaySummaryBar items={summaryItems} />
            {SCHEDULE_DEPARTMENTS.map((dept) => (
              <DesktopTodayDepartment
                key={dept.id}
                deptTitle={dept.title}
                deptSubtitle={deptSubtitle(dept.id)}
                rows={rowsForDept(dept.id)}
                today={today}
                workingLabel={workingCountLabel}
                restPrefix={t("schedule.restLabel")}
              />
            ))}
          </>
        ) : (
          SCHEDULE_DEPARTMENTS.map((dept) => (
            <DepartmentWeekTable
              key={dept.id}
              title={dept.title}
              subtitle={deptSubtitle(dept.id)}
              rows={rowsForDept(dept.id)}
              weekDates={currentWeek.dates}
              dayLabels={dayLabels}
              colEmployee={t("schedule.colEmployee")}
              colWeekHours={t("schedule.colWeekHours")}
              restLabel={t("schedule.rest")}
            />
          ))
        )}
      </div>
    </PageContent>
  );
}
