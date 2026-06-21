"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Snowflake,
  Timer,
  Truck,
  Users,
  X,
} from "lucide-react";
import { ERP_NAV_ROUTES, type ErpNavRoute } from "@/lib/layout/navigation";
import { KarumaLogo } from "@/components/brand/KarumaLogo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ROUTE_NAV_KEY } from "@/lib/i18n/translations";

const NAV_ICONS: Record<ErpNavRoute, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/staff": Users,
  "/schedule": CalendarDays,
  "/marketing": Megaphone,
  "/delivery": Truck,
  "/dashboard/reservas": CalendarCheck,
};

const RESERVAS_ROUTES = ["/dashboard/reservas", "/dashboard/mesa-view", "/dashboard/clientes", "/dashboard/config"];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,16rem)] flex-col bg-gray-900 transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4 sm:h-16 sm:px-5">
          <div className="flex min-w-0 items-center">
            <KarumaLogo tone="light" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
            aria-label="关闭菜单"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {ERP_NAV_ROUTES.map((route) => {
            const isActive =
              route === "/dashboard"
                ? pathname === "/dashboard"
                : route === "/dashboard/reservas"
                  ? RESERVAS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
                  : pathname === route || pathname.startsWith(`${route}/`);
            const Icon = NAV_ICONS[route];
            const navKey = ROUTE_NAV_KEY[route];
            return (
              <Link
                key={route}
                href={route}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-karuma-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" />
                {t(`nav.${navKey}`)}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {t("nav.compras")}
            </p>
            <Link
              href="/dashboard/cominport"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === "/dashboard/cominport"
                  ? "bg-karuma-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <PackageSearch className="h-5 w-5 shrink-0 opacity-90" />
              {t("nav.cominport")}
            </Link>
            <Link
              href="/dashboard/jet-extramar"
              onClick={onClose}
              className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === "/dashboard/jet-extramar"
                  ? "bg-karuma-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Snowflake className="h-5 w-5 shrink-0 opacity-90" />
              {t("nav.jetExtramar")}
            </Link>
          </div>
        </nav>

        <div className="border-t border-gray-800 px-3 py-3">
          <Link
            href="/kiosk"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Timer className="h-5 w-5 shrink-0 opacity-80" />
            Modo fichaje
          </Link>
        </div>
      </aside>
    </>
  );
}
