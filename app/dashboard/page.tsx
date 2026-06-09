"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function DashboardPage() {
  const { t } = useLanguage();

  const cards = [
    { label: t("dashboard.todaySales"), value: "€3,240" },
    { label: t("dashboard.yesterdaySales"), value: "€2,890" },
    { label: t("dashboard.monthSales"), value: "€68,500" },
    { label: t("dashboard.todayFootfall"), value: "142" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-gray-900">{t("dashboard.systemStatus")}</h2>
        <p className="mt-2 text-sm text-gray-600">{t("dashboard.systemNote")}</p>
      </div>
    </div>
  );
}
