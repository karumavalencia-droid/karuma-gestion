"use client";

import { Menu, Bell } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { locale, t } = useLanguage();

  const today = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur-md sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 lg:hidden"
          aria-label={t("header.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
          <p className="text-[10px] capitalize text-gray-500 sm:text-xs">{today}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <LanguageSwitcher />
        <button
          className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 sm:flex"
          aria-label={t("header.notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-karuma-500" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-karuma-600 text-xs font-bold text-white sm:h-9 sm:w-9">
          MG
        </div>
      </div>
    </header>
  );
}
