"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/translations";

const options: { id: Locale; labelKey: string }[] = [
  { id: "es", labelKey: "language.es" },
  { id: "zh", labelKey: "language.zh" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5"
      role="group"
      aria-label={t("language.label")}
    >
      {options.map((opt) => {
        const active = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-pressed={active}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
