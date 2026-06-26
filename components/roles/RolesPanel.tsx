"use client";

import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { rolePermissions } from "@/lib/staff-mock/data";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function RolesPanel() {
  const { t } = useLanguage();

  return (
    <PageContent>
      <PageHeader description={t("pages.roles.description")} hideTitle />

      <div className="grid gap-4 sm:grid-cols-2">
        {rolePermissions.map((role) => (
          <article
            key={role.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {role.rol}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">{role.descripcion}</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {t("pages.roles.permissions")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {role.permisos.map((p) => (
                <StatusBadge key={p} variant="info">
                  {p}
                </StatusBadge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PageContent>
  );
}
