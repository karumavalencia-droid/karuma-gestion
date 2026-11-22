"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LayoutDashboard, LayoutGrid, LogOut, Settings, Tablet, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

// Dentro del ERP: pestañas de Reservas con Hoy y Clientes.
const TABS_ERP = [
  { href: "/dashboard/hoy", label: "Hoy", icon: LayoutDashboard },
  { href: "/dashboard/reservas", label: "Lista", icon: CalendarCheck },
  { href: "/dashboard/mesa-view", label: "Mesas", icon: LayoutGrid },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/config", label: "Config", icon: Settings },
];

// Panel de reservas independiente (/panel): las mismas tres pestañas que el de Spicy Soul.
const TABS_PANEL = [
  { href: "/panel/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/panel/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/panel/config", label: "Config", icon: Settings },
];

export function ReservasNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const enPanel = pathname.startsWith("/panel");
  const tabs = enPanel ? TABS_PANEL : TABS_ERP;

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="tema-fijo-claro flex flex-1 gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (enPanel && pathname.startsWith(`${href}/`));
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
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      {enPanel && (
        <>
          <Link
            href="/tablet"
            className="hidden items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 sm:flex"
          >
            <Tablet className="h-4 w-4" />
            Tablet
          </Link>
          <button
            onClick={() => void logout().then(() => { window.location.href = "/login"; })}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 sm:text-sm"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </>
      )}
    </div>
  );
}
