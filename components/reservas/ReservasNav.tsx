"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LayoutGrid, Users, Settings } from "lucide-react";

const TABS = [
  { href: "/dashboard/reservas", label: "Lista", labelZh: "预约列表", icon: CalendarCheck },
  { href: "/dashboard/mesa-view", label: "Mesas", labelZh: "桌位图", icon: LayoutGrid },
  { href: "/dashboard/clientes", label: "Clientes", labelZh: "客户", icon: Users },
  { href: "/dashboard/config", label: "Config", labelZh: "设置", icon: Settings },
];

export function ReservasNav({ lang = "es" }: { lang?: "es" | "zh" }) {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
      {TABS.map(({ href, label, labelZh, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:text-sm ${
              active
                ? "bg-karuma-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{lang === "zh" ? labelZh : label}</span>
          </Link>
        );
      })}
    </div>
  );
}
