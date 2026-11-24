"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { resolvePageTitle } from "@/lib/layout/page-title";

const SIDEBAR_COLLAPSED_KEY = "karuma.sidebarCollapsed";

const NO_SIDEBAR_ROUTES = ["/login", "/my-attendance", "/my-schedule", "/my-payroll", "/coach"];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // En pantallas grandes el menú se puede ocultar del todo para dejar más
  // sitio a la sala. La preferencia se recuerda en este dispositivo.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const noSidebar = NO_SIDEBAR_ROUTES.includes(pathname) || (pathname === "/recetas" && Boolean(user?.employeeId));
  const publicPage = pathname === "/login";

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // Sin almacenamiento disponible: el menú queda visible.
    }
  }, []);

  const updateCollapsed = (value: boolean) => {
    setSidebarCollapsed(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
    } catch {
      // Ignorar: la preferencia solo dura esta visita.
    }
  };

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
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onCollapse={() => {
          setSidebarOpen(false);
          updateCollapsed(true);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => {
            // En pantalla grande con el menú oculto, el botón lo vuelve a fijar;
            // en móvil/tablet vertical abre el cajón lateral de siempre.
            const desktopQuery = isMesaView ? "(min-width: 1536px)" : "(min-width: 1024px)";
            if (sidebarCollapsed && window.matchMedia(desktopQuery).matches) {
              updateCollapsed(false);
            } else {
              setSidebarOpen(true);
            }
          }}
          title={title}
        />
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
