"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { purchaseSamples } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PurchasesErpPanel() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.purchases.title")} description={t("pages.purchases.description")}>
        <Button variant="secondary">
          <Plus className="h-4 w-4" />
          {t("pages.purchases.newPurchase")}
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.purchases.supplier")}</th>
                <th className="px-4 py-3">{t("pages.purchases.product")}</th>
                <th className="px-4 py-3">{t("pages.purchases.quantity")}</th>
                <th className="px-4 py-3 text-right">{t("pages.purchases.amount")}</th>
                <th className="px-4 py-3">{t("pages.purchases.date")}</th>
                <th className="px-4 py-3">{t("pages.purchases.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchaseSamples.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{row.proveedor}</td>
                  <td className="px-4 py-3.5 text-gray-700">{row.producto}</td>
                  <td className="px-4 py-3.5 text-gray-600">{row.cantidad}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                    {formatCurrency(row.importe)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={row.estado === "recibido" ? "success" : "warning"}>
                      {row.estado === "recibido"
                        ? t("pages.purchases.received")
                        : t("pages.purchases.pending")}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
