"use client";

// Marco de la zona privada del propietario. Navegación propia (no usa el
// Sidebar general, así Finanzas privadas nunca aparece para empleados/manager).
// Incluye un vigilante de inactividad en cliente (15 min) que fuerza volver a
// verificar el MFA, complementando el control de servidor.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  FileLock2,
  Home,
  LogOut,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getSupabaseAuthBrowser } from "@/lib/supabase/ssr-browser";

const OWNER_IDLE_MS = 15 * 60 * 1000;

const NAV = [
  { href: "/owner", label: "Resumen", icon: Home },
  { href: "/owner/finanzas", label: "Finanzas privadas", icon: Wallet },
  { href: "/owner/finanzas/banco", label: "Banco", icon: Banknote },
  { href: "/owner/finanzas/nominas", label: "Nóminas", icon: FileLock2 },
  { href: "/owner/finanzas/alquiler", label: "Alquiler", icon: FileLock2 },
  { href: "/owner/security", label: "Seguridad", icon: ShieldCheck },
];

export function OwnerShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        router.replace("/security/verify-mfa");
      }, OWNER_IDLE_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  const signOut = async () => {
    try {
      await getSupabaseAuthBrowser()?.auth.signOut();
    } catch {
      /* no-op */
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/security/login");
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-6">
      <aside className="shrink-0 sm:w-56">
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-3 text-white">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              Zona propietario
            </p>
            <p className="truncate text-xs text-gray-300">{email}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-karuma-50 font-medium text-karuma-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
