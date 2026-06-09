"use client";

import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { staffMembers } from "@/lib/staff-mock/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function StaffPanel() {
  const { t, locale } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.staff.description")} hideTitle />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("pages.staff.name")}</th>
                <th className="px-4 py-3">{t("pages.staff.role")}</th>
                <th className="px-4 py-3">{t("pages.staff.department")}</th>
                <th className="px-4 py-3">{t("pages.staff.email")}</th>
                <th className="px-4 py-3">{t("pages.staff.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffMembers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    {locale === "zh" ? s.nombreZh : s.nombre}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{s.rol}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.departamento}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={s.estado === "activo" ? "success" : "neutral"}>
                      {s.estado === "activo"
                        ? t("pages.staff.active")
                        : t("pages.staff.inactive")}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContent>
  );
}
