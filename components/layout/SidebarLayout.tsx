"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ROUTE_NAV_KEY, ROUTE_PAGE_TITLE } from "@/lib/i18n/translations";

const NO_SIDEBAR_ROUTES = ["/login", "/my-attendance"];

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
  const router = useRouter();
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const noSidebar = NO_SIDEBAR_ROUTES.includes(pathname);
  const publicPage = pathname === "/login";

  useEffect(() => {
    if (ready && !user && !publicPage) {
      router.replace("/login");
    }
  }, [ready, user, publicPage, router]);

  if (publicPage || (noSidebar && ready && user)) {
    return <>{children}</>;
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 text-sm text-gray-500">
        Verificando sesión...
      </div>
    );
  }

  const title = resolvePageTitle(pathname, t);
  const isMesaView = pathname === "/dashboard/mesa-view";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 ${
          isMesaView ? "p-0" : "p-3 sm:p-4 md:p-6"
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}

/** @deprecated Usar SidebarLayout */
export const AppShell = SidebarLayout;
