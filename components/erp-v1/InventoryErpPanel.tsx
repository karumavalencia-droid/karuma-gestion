"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inventorySamples } from "@/lib/erp-v1/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const statusVariant = {
  ok: "success" as const,
  bajo: "warning" as const,
  critico: "danger" as const,
};

export function InventoryErpPanel() {
  const { t } = useLanguage();

  const statusLabel = (s: "ok" | "bajo" | "critico") => {
    if (s === "ok") return t("pages.inventory.ok");
    if (s === "critico") return t("pages.inventory.critical");
    return t("pages.inventory.low");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pages.inventory.title")}
        description={t("pages.inventory.description")}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.inventory.product")}</th>
                <th className="px-4 py-3">{t("pages.inventory.category")}</th>
                <th className="px-4 py-3 text-right">{t("pages.inventory.stock")}</th>
                <th className="px-4 py-3">{t("pages.inventory.unit")}</th>
                <th className="px-4 py-3 text-right">{t("pages.inventory.minimum")}</th>
                <th className="px-4 py-3">{t("pages.inventory.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventorySamples.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{row.producto}</td>
                  <td className="px-4 py-3.5 text-gray-600">{row.categoria}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                    {row.stock}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{row.unidad}</td>
                  <td className="px-4 py-3.5 text-right text-gray-600">{row.minimo}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={statusVariant[row.estado]}>
                      {statusLabel(row.estado)}
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
