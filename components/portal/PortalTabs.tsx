"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarDays, MapPinCheck, MessageSquare, type LucideIcon } from "lucide-react";

type PortalTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** v2: Nómina, Recetas, Tareas — añadir aquí con enabled: false hasta lanzarlas. */
  enabled: boolean;
};

const TABS: PortalTab[] = [
  { href: "/my-attendance", label: "Fichar", icon: MapPinCheck, enabled: true },
  { href: "/my-schedule", label: "Horario", icon: CalendarDays, enabled: true },
  { href: "/announcements", label: "Anuncios", icon: MessageSquare, enabled: true },
  { href: "/coach", label: "Coach", icon: Bot, enabled: true },
];

export function PortalTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-gray-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-md">
        {TABS.filter((tab) => tab.enabled).map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                active ? "text-karuma-300" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="h-6 w-6" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
