"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ROUTE_NAV_KEY, ROUTE_PAGE_TITLE } from "@/lib/i18n/translations";

const STANDALONE_ROUTES = ["/login"];

function resolvePageTitle(pathname: string, t: (key: string) => string): string {
  const pageTitleKey = ROUTE_PAGE_TITLE[pathname];
  if (pageTitleKey) return t(pageTitleKey);

  const navKey = ROUTE_NAV_KEY[pathname];
  if (navKey) return t(`nav.${navKey}`);

  return t("header.appName");
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  const title = resolvePageTitle(pathname, t);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/** @deprecated Usar SidebarLayout */
export const AppShell = SidebarLayout;
