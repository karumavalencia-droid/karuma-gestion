"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Warehouse,
  ShoppingCart,
  Users,
  Wallet,
  Megaphone,
  PieChart,
  ChefHat,
  Settings,
  Bot,
  Target,
  Database,
  Star,
  Crown,
  Truck,
  FileText,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ROUTE_NAV_KEY } from "@/lib/i18n/translations";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/ceo", icon: Crown },
  { href: "/ai-gerente", icon: Bot },
  { href: "/datos", icon: Database },
  { href: "/objetivo", icon: Target },
  { href: "/pedidos", icon: ClipboardList },
  { href: "/inventario", icon: Warehouse },
  { href: "/compras", icon: ShoppingCart },
  { href: "/facturas", icon: FileText },
  { href: "/food-cost", icon: ChefHat },
  { href: "/personal", icon: Users },
  { href: "/finanzas", icon: Wallet },
  { href: "/profit", icon: PieChart },
  { href: "/reviews", icon: Star },
  { href: "/delivery-center", icon: Truck },
  { href: "/marketing", icon: Megaphone },
  { href: "/cocina", icon: ChefHat },
  { href: "/configuracion", icon: Settings },
];

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
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
            aria-label={t("header.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 sm:space-y-1 sm:px-3 sm:py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const navKey = ROUTE_NAV_KEY[item.href];
            const label = navKey ? t(`nav.${navKey}`) : item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-karuma-600 text-white"
                    : "text-gray-300 active:bg-gray-800 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-3 sm:p-4">
          <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
            <p className="text-xs font-medium text-gray-300">Karuma Sushi & Grill</p>
            <p className="text-[10px] text-gray-500 sm:text-xs">Valencia · Ruzafa</p>
          </div>
        </div>
      </aside>
    </>
  );
}
