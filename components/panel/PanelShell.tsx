"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, LayoutGrid, LogOut, Settings, Tablet } from "lucide-react";
import { KarumaLogo } from "@/components/brand/KarumaLogo";
import { useAuth } from "@/lib/auth/AuthProvider";

const NAV = [
  { href: "/panel/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/panel/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/panel/config", label: "Config", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/panel/reservas": "Reservas",
  "/panel/mesas": "Plano de mesas",
  "/panel/config": "Configuración",
};

/** Panel de reservas independiente del ERP: mismo esquema que el de Spicy Soul Hotpot. */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 text-sm text-gray-500">
        Verificando sesión...
      </div>
    );
  }

  const title = TITLES[pathname] ?? "Reservas";
  const isMesas = pathname === "/panel/mesas";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`tema-fijo-claro fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-gray-900 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-gray-800 px-4 py-5">
          <div className="w-36">
            <KarumaLogo tone="light" />
          </div>
          <p className="mt-2 text-xs text-gray-400">Panel de reservas</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-karuma-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-800 p-3">
          <Link
            href="/tablet"
            target="_blank"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <Tablet className="h-3.5 w-3.5" />
            Vista tablet ↗
          </Link>
          <Link
            href="/reservas"
            target="_blank"
            className="mb-2 block rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            Web pública ↗
          </Link>
          <button
            type="button"
            onClick={() => void logout().then(() => { window.location.href = "/login"; })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Abrir menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
        </header>
        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 ${isMesas ? "p-0" : "p-3 sm:p-4 md:p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
