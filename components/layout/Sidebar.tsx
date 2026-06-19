"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, CalendarDays, LayoutDashboard, Megaphone, Truck, Users, X } from "lucide-react";
import { ERP_NAV_ROUTES, type ErpNavRoute } from "@/lib/layout/navigation";
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
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-karuma-600 text-sm font-bold text-white sm:h-9 sm:w-9">
              K
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{t("header.appName")}</p>
              <p className="truncate text-[10px] text-gray-400 sm:text-xs">v1.0 · Sushi & Grill</p>
            </div>
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
        </nav>

        <div className="border-t border-gray-800 px-4 py-3">
          <p className="text-[10px] text-gray-500 sm:text-xs">结构冻结 · 仅员工与排班</p>
        </div>
      </aside>
    </>
  );
}
