"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { invoiceSamples, type InvoiceRecord, type InvoiceStatus } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency, formatDate } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

const statusVariant: Record<InvoiceStatus, "warning" | "success" | "info"> = {
  pending: "warning",
  paid: "success",
  review: "info",
};

export function InvoicesErpPanel() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(invoiceSamples);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({
    proveedor: "",
    fecha: new Date().toISOString().slice(0, 10),
    importe: "",
    iva: "",
    estado: "pending" as InvoiceStatus,
  });

  const statusLabel = (s: InvoiceStatus) => {
    if (s === "paid") return t("pages.invoices.statusPaid");
    if (s === "review") return t("pages.invoices.statusReview");
    return t("pages.invoices.statusPending");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proveedor || !form.importe) return;

    const nueva: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      proveedor: form.proveedor,
      fecha: form.fecha,
      importe: parseFloat(form.importe) || 0,
      iva: parseFloat(form.iva) || 0,
      estado: form.estado,
      archivo: fileName || undefined,
    };

    setInvoices((prev) => [nueva, ...prev]);
    setForm({
      proveedor: "",
      fecha: new Date().toISOString().slice(0, 10),
      importe: "",
      iva: "",
      estado: "pending",
    });
    setFileName("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pages.invoices.title")}
        description={t("pages.invoices.description")}
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:border-karuma-400 hover:bg-karuma-50/40">
            <FileText className="h-6 w-6 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {t("pages.invoices.uploadPdf")}
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:border-karuma-400 hover:bg-karuma-50/40">
            <ImageIcon className="h-6 w-6 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {t("pages.invoices.uploadImage")}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <div className="col-span-2 flex items-center rounded-xl bg-karuma-50 px-4 py-3 text-sm text-karuma-800">
            <Upload className="mr-2 h-5 w-5 shrink-0" />
            {fileName
              ? `${t("pages.invoices.fileSelected")}: ${fileName}`
              : t("pages.invoices.uploadPdf")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("pages.invoices.supplier")}
            </span>
            <input
              type="text"
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className={inputClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{t("pages.invoices.date")}</span>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              {t("pages.invoices.amount")}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.importe}
              onChange={(e) => setForm({ ...form, importe: e.target.value })}
              className={inputClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{t("pages.invoices.vat")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.iva}
              onChange={(e) => setForm({ ...form, iva: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{t("pages.invoices.status")}</span>
            <select
              value={form.estado}
              onChange={(e) =>
                setForm({ ...form, estado: e.target.value as InvoiceStatus })
              }
              className={inputClass}
            >
              <option value="pending">{t("pages.invoices.statusPending")}</option>
              <option value="paid">{t("pages.invoices.statusPaid")}</option>
              <option value="review">{t("pages.invoices.statusReview")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit">{t("pages.invoices.addInvoice")}</Button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
          {t("pages.invoices.recent")}
        </h3>
        <div className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{inv.proveedor}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(inv.fecha)}
                  {inv.archivo && ` · ${inv.archivo}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(inv.importe)}
                </span>
                <span className="text-xs text-gray-500">
                  {t("pages.invoices.vat")}: {formatCurrency(inv.iva)}
                </span>
                <StatusBadge variant={statusVariant[inv.estado]}>
                  {statusLabel(inv.estado)}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
