"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock3,
  CreditCard,
  Download,
  Euro,
  Heart,
  ReceiptText,
  RefreshCw,
  Repeat2,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useDishReorders } from "@/lib/dish-reorders/useDishReorders";
import {
  filterDailySales,
  parseDailySalesNotes,
  percentageChange,
  summarizeDailySales,
} from "@/lib/sales-sync/reporting";
import type { DailySalesRecord } from "@/lib/sales-sync/types";
import { useDailySales } from "@/lib/sales-sync/useDailySales";
import { formatCurrency } from "@/lib/utils";

type RangeMode = "today" | "yesterday" | "week" | "month" | "all" | "custom";

function madridDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportDailySalesCsv(records: DailySalesRecord[], startDate: string, endDate: string) {
  const header = [
    "Fecha",
    "Ventas brutas",
    "Importe cobrado",
    "Pedidos",
    "Clientes",
    "Ticket medio",
    "Efectivo",
    "Tarjeta",
    "Delivery",
    "Descuentos",
    "Devoluciones",
    "Propinas",
  ];
  const rows = records.map((record) => {
    const notes = parseDailySalesNotes(record.notes);
    return [
      record.date,
      record.grossSales,
      record.netSales,
      record.orders,
      record.customers,
      record.averageTicket,
      record.cashSales,
      record.cardSales,
      record.deliverySales,
      notes.discountAmount,
      notes.paymentRefundAmount,
      notes.tipsAmount,
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ventas-restosuite-${startDate}-${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatReportDate(isoDate: string, locale: "es" | "zh"): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function formatUpdatedAt(isoDate: string, locale: "es" | "zh"): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(isoDate));
}

export function SalesErpPanel() {
  const { locale, t } = useLanguage();
  const today = madridDate();
  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const sales = useDailySales("?startDate=2000-01-01");
  const reorders = useDishReorders(startDate, endDate);

  const filteredRecords = filterDailySales(sales.records, startDate, endDate);
  const summary = summarizeDailySales(filteredRecords);
  const dayCount = inclusiveDays(startDate, endDate);
  const previousRecords = filterDailySales(
    sales.records,
    shiftIsoDate(startDate, -dayCount),
    shiftIsoDate(startDate, -1),
  );
  const previousSummary = summarizeDailySales(previousRecords);
  const grossTrend = percentageChange(summary.grossSales, previousSummary.grossSales);
  const netTrend = percentageChange(summary.netSales, previousSummary.netSales);
  const paymentTotal =
    summary.cashSales +
    summary.cardSales +
    summary.deliverySales +
    summary.unclassifiedPaymentAmount;
  const latestFirst = [...filteredRecords].reverse();
  const chartMax = Math.max(...filteredRecords.map((record) => record.netSales), 1);
  const firstAvailableDate = sales.records[0]?.date;
  const lastAvailableDate = sales.records.at(-1)?.date;
  const isTodayPartial = endDate === today && filteredRecords.some((record) => record.date === today);
  const reorderedDishes = reorders.records.filter(
    (record) => record.reorderedOrders > 0,
  );
  const topReorderedDishes = reorderedDishes.slice(0, 10);

  const applyPreset = (mode: Exclude<RangeMode, "custom">) => {
    setRangeMode(mode);
    if (mode === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (mode === "yesterday") {
      const yesterday = shiftIsoDate(today, -1);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (mode === "week") {
      setStartDate(shiftIsoDate(today, -6));
      setEndDate(today);
    } else if (mode === "month") {
      setStartDate(`${today.slice(0, 7)}-01`);
      setEndDate(today);
    } else if (firstAvailableDate && lastAvailableDate) {
      setStartDate(firstAvailableDate);
      setEndDate(lastAvailableDate);
    }
  };

  const trendText = (value: number | null) =>
    value === null
      ? undefined
      : `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES", {
          maximumFractionDigits: 1,
        })}% ${t("pages.sales.vsPrevious")}`;

  const paymentRows = [
    {
      label: t("pages.sales.cash"),
      value: summary.cashSales,
      color: "bg-emerald-500",
    },
    {
      label: t("pages.sales.card"),
      value: summary.cardSales,
      color: "bg-blue-600",
    },
    {
      label: t("pages.sales.delivery"),
      value: summary.deliverySales,
      color: "bg-amber-500",
    },
    {
      label: t("pages.sales.unclassified"),
      value: summary.unclassifiedPaymentAmount,
      color: "bg-gray-400",
    },
  ].filter((row) => row.value > 0);

  return (
    <PageContent>
      <PageHeader description={t("pages.sales.description")} hideTitle>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={filteredRecords.length === 0}
          onClick={() => exportDailySalesCsv(filteredRecords, startDate, endDate)}
        >
          <Download className="h-4 w-4" />
          {t("pages.sales.export")}
        </Button>
      </PageHeader>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 px-4 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  {t("pages.sales.realData")}
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-300">
                {sales.records.length > 0
                  ? `${sales.records.length} ${t("pages.sales.days")} · ${formatReportDate(
                      firstAvailableDate!,
                      locale,
                    )} – ${formatReportDate(lastAvailableDate!, locale)}${
                      sales.updatedAt
                        ? ` · ${t("pages.sales.updated")} ${formatUpdatedAt(
                            sales.updatedAt,
                            locale,
                          )}`
                        : ""
                    }`
                  : t("pages.sales.noData")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sales.refetch();
                reorders.refetch();
              }}
              disabled={sales.loading || reorders.loading}
              className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  sales.loading || reorders.loading ? "animate-spin" : ""
                }`}
              />
              {t("pages.sales.refresh")}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", t("pages.sales.filterToday")],
                ["yesterday", t("pages.sales.filterYesterday")],
                ["week", t("pages.sales.filterWeek")],
                ["month", t("pages.sales.filterMonth")],
                ["all", t("pages.sales.filterAll")],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                disabled={mode === "all" && sales.records.length === 0}
                onClick={() => applyPreset(mode)}
                className={`min-h-9 rounded-lg px-3 text-xs font-medium transition ${
                  rangeMode === mode
                    ? "bg-white text-gray-950"
                    : "bg-white/10 text-gray-200 hover:bg-white/15"
                } disabled:opacity-40`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-gray-300">
              {t("pages.sales.startDate")}
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setRangeMode("custom");
                  setStartDate(value);
                  if (value > endDate) setEndDate(value);
                }}
                className="mt-1.5 block min-h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
              />
            </label>
            <label className="text-xs font-medium text-gray-300">
              {t("pages.sales.endDate")}
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) => {
                  const value = event.target.value;
                  setRangeMode("custom");
                  setEndDate(value);
                  if (value < startDate) setStartDate(value);
                }}
                className="mt-1.5 block min-h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
              />
            </label>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
              {filteredRecords.length} {t("pages.sales.daysWithData")}
            </div>
          </div>
        </div>

        {sales.error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {sales.error}
            </span>
            <button type="button" className="font-semibold" onClick={() => sales.refetch()}>
              {t("pages.sales.retry")}
            </button>
          </div>
        )}

        {isTodayPartial && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 sm:px-6">
            {t("pages.sales.todayPartial")}
          </div>
        )}
      </section>

      {sales.loading && sales.records.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              title={t("pages.sales.grossSales")}
              value={formatCurrency(summary.grossSales)}
              icon={Euro}
              trend={trendText(grossTrend)}
              trendUp={(grossTrend ?? 0) >= 0}
              iconColor="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              title={t("pages.sales.netSales")}
              value={formatCurrency(summary.netSales)}
              icon={ReceiptText}
              trend={trendText(netTrend)}
              trendUp={(netTrend ?? 0) >= 0}
              iconColor="bg-gray-950 text-white"
            />
            <StatCard
              title={t("pages.sales.orders")}
              value={summary.orders.toLocaleString("es-ES")}
              subtitle={`${filteredRecords.length} ${t("pages.sales.daysWithData")}`}
              icon={ShoppingBag}
              iconColor="bg-amber-50 text-amber-700"
            />
            <StatCard
              title={t("pages.sales.customers")}
              value={summary.customers.toLocaleString("es-ES")}
              icon={Users}
              iconColor="bg-blue-50 text-blue-700"
            />
            <StatCard
              title={t("pages.sales.averageTicket")}
              value={formatCurrency(summary.averageTicket)}
              icon={BarChart3}
              iconColor="bg-cyan-50 text-cyan-700"
            />
            <StatCard
              title={t("pages.sales.cash")}
              value={formatCurrency(summary.cashSales)}
              icon={Banknote}
              iconColor="bg-green-50 text-green-700"
            />
            <StatCard
              title={t("pages.sales.card")}
              value={formatCurrency(summary.cardSales)}
              icon={CreditCard}
              iconColor="bg-indigo-50 text-indigo-700"
            />
            <StatCard
              title={t("pages.sales.delivery")}
              value={formatCurrency(summary.deliverySales)}
              icon={Truck}
              iconColor="bg-orange-50 text-orange-700"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {t("pages.sales.dailyTrend")}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatReportDate(startDate, locale)} – {formatReportDate(endDate, locale)}
                  </p>
                </div>
                <CalendarDays className="h-4 w-4 text-gray-400" />
              </div>
              {filteredRecords.length > 0 ? (
                <div className="overflow-x-auto px-4 pb-4 pt-5">
                  <div className="flex h-44 min-w-full items-end gap-1.5">
                    {filteredRecords.map((record) => (
                      <div
                        key={record.date}
                        className="group flex min-w-3 flex-1 flex-col items-center justify-end"
                        title={`${formatReportDate(record.date, locale)}: ${formatCurrency(
                          record.netSales,
                        )}`}
                      >
                        <div
                          className="w-full min-w-2 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 transition group-hover:from-gray-950 group-hover:to-gray-700"
                          style={{
                            height: `${Math.max(4, (record.netSales / chartMax) * 150)}px`,
                          }}
                        />
                        <span className="mt-2 hidden text-[9px] text-gray-400 sm:block">
                          {record.date.slice(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="px-4 py-12 text-center text-sm text-gray-500">
                  {t("pages.sales.noDataRange")}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                {t("pages.sales.paymentMix")}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {t("pages.sales.paymentMixDescription")}
              </p>
              <div className="mt-5 space-y-4">
                {paymentRows.length > 0 ? (
                  paymentRows.map((row) => {
                    const percentage = paymentTotal > 0 ? (row.value / paymentTotal) * 100 : 0;
                    return (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-gray-700">{row.label}</span>
                          <span className="text-gray-500">
                            {formatCurrency(row.value)} · {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${row.color}`}
                            style={{ width: `${Math.max(percentage, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-sm text-gray-500">
                    {t("pages.sales.noPaymentData")}
                  </p>
                )}
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                <div>
                  <dt className="text-[11px] text-gray-500">{t("pages.sales.discounts")}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(summary.discountAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-gray-500">{t("pages.sales.refunds")}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(summary.paymentRefundAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-gray-500">{t("pages.sales.tips")}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(summary.tipsAmount)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-amber-200 bg-[#fffaf0] shadow-sm">
            <div className="relative overflow-hidden border-b border-amber-200 bg-gradient-to-br from-[#24180f] via-[#4a2915] to-[#7d3f18] px-4 py-5 text-white sm:px-6">
              <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border border-white/10 bg-amber-300/10" />
              <div className="absolute -bottom-20 right-24 h-36 w-36 rounded-full border border-white/5" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Heart className="h-4 w-4 fill-current" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">
                      {t("pages.sales.reorderSignal")}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    {t("pages.sales.reorderTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-amber-50/80">
                    {t("pages.sales.reorderDescription")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
                    <p className="text-[10px] uppercase tracking-wide text-amber-100/70">
                      {t("pages.sales.reorderCoveredBills")}
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {reorders.coveredOrders.toLocaleString("es-ES")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
                    <p className="text-[10px] uppercase tracking-wide text-amber-100/70">
                      {t("pages.sales.reorderDishes")}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{reorderedDishes.length}</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur sm:col-span-1">
                    <p className="text-[10px] uppercase tracking-wide text-amber-100/70">
                      {t("pages.sales.reorderDays")}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{reorders.daysWithData}</p>
                  </div>
                </div>
              </div>
            </div>

            {reorders.error ? (
              <div className="flex items-center gap-2 px-4 py-5 text-sm text-red-800 sm:px-6">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {reorders.error}
              </div>
            ) : reorders.loading && reorders.records.length === 0 ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-amber-100/70"
                  />
                ))}
              </div>
            ) : topReorderedDishes.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-6">
                <Repeat2 className="mx-auto h-8 w-8 text-amber-700/50" />
                <p className="mt-3 text-sm font-medium text-gray-800">
                  {t("pages.sales.noReorderData")}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t("pages.sales.noReorderDataDescription")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-amber-200 bg-amber-100/50 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-950/60">
                      <th className="w-14 px-4 py-3 text-center">#</th>
                      <th className="px-3 py-3">{t("pages.sales.reorderDish")}</th>
                      <th className="px-3 py-3 text-right">
                        {t("pages.sales.reorderBills")}
                      </th>
                      <th className="px-3 py-3 text-right">
                        {t("pages.sales.reorderRate")}
                      </th>
                      <th className="px-3 py-3 text-right">
                        {t("pages.sales.reorderQty")}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {t("pages.sales.reorderGap")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/70">
                    {topReorderedDishes.map((dish, index) => (
                      <tr key={dish.itemId} className="transition hover:bg-white/70">
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              index < 3
                                ? "bg-amber-400 text-amber-950"
                                : "bg-white text-gray-500"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="font-semibold text-gray-950">{dish.itemName}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {dish.category || t("pages.sales.reorderNoCategory")}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span className="font-semibold text-gray-950">
                            {dish.reorderedOrders}
                          </span>
                          <span className="text-gray-400"> / {dish.ordersWithItem}</span>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                            {dish.reorderRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold text-gray-800">
                          +{dish.reorderQty.toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-600">
                          {dish.averageGapMinutes !== null ? (
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <Clock3 className="h-3.5 w-3.5 text-amber-700" />
                              {dish.averageGapMinutes.toLocaleString("es-ES")}{" "}
                              {t("pages.sales.minutes")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-amber-200 bg-white/50 px-4 py-3 text-xs text-gray-500 sm:px-6">
                  {t("pages.sales.reorderMethod")}
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {t("pages.sales.dailyDetail")}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("pages.sales.dailyDetailDescription")}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {filteredRecords.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3">
                      {t("pages.sales.colDate")}
                    </th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.gross")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.collected")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.orders")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.customers")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.ticket")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.cash")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.card")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.delivery")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.discounts")}</th>
                    <th className="px-3 py-3 text-right">{t("pages.sales.refunds")}</th>
                    <th className="px-4 py-3 text-right">{t("pages.sales.tips")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {latestFirst.map((record) => {
                    const notes = parseDailySalesNotes(record.notes);
                    return (
                      <tr key={record.date} className="hover:bg-emerald-50/30">
                        <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-3 font-medium text-gray-900">
                          {formatReportDate(record.date, locale)}
                          {record.date === today && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                              {t("pages.sales.partial")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(record.grossSales)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(record.netSales)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">{record.orders}</td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {record.customers}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(record.averageTicket)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(record.cashSales)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(record.cardSales)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(record.deliverySales)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(notes.discountAmount)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600">
                          {formatCurrency(notes.paymentRefundAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(notes.tipsAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageContent>
  );
}
