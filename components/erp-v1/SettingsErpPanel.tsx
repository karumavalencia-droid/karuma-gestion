"use client";

import { Building2, Globe, Info } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function SettingsErpPanel() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pages.settings.title")}
        description={t("pages.settings.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t("pages.settings.language")}</h3>
              <p className="text-sm text-gray-500">{t("pages.settings.languageDesc")}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-karuma-50 text-karuma-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t("pages.settings.restaurant")}</h3>
              <p className="text-sm text-gray-500">{t("pages.settings.location")}</p>
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {t("pages.settings.restaurantName")}
          </p>
          <p className="mt-1 text-sm text-gray-600">{t("pages.settings.location")}</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t("pages.settings.version")}</h3>
              <p className="text-sm text-gray-500">Karuma ERP {t("pages.settings.versionValue")}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
