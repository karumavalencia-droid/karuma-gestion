"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUserInitials, useAuth } from "@/lib/auth/AuthProvider";
import { normalizeRole, roleLabel } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { debeAvisar, lanzarAviso, preferenciaActiva } from "@/lib/inbox/avisos";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, t } = useLanguage();
  const role = normalizeRole(user?.role);
  const displayName = user?.name ?? "Zhou";
  const isMesaView = pathname === "/dashboard/mesa-view";
  const sinResponder = useSinResponder(role);

  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur-md sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 ${
            isMesaView ? "2xl:hidden" : "lg:hidden"
          }`}
          aria-label={t("header.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
          <p className="text-[10px] capitalize text-gray-500 sm:text-xs">{today}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Link
          href="/mensajes"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-100"
          aria-label={
            sinResponder > 0
              ? `${t("header.notifications")}: ${sinResponder} sin responder`
              : t("header.notifications")
          }
          title={
            sinResponder > 0
              ? `${sinResponder} mensaje${sinResponder === 1 ? "" : "s"} sin responder`
              : "Mensajes y reseñas"
          }
        >
          <Bell className="h-5 w-5" />
          {sinResponder > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-karuma-500 px-1 text-[10px] font-bold leading-none text-white">
              {sinResponder > 9 ? "9+" : sinResponder}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-gray-900">{displayName}</p>
            <p className="text-[10px] text-gray-500">{roleLabel(role, locale)}</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-karuma-600 text-xs font-bold text-white sm:h-9 sm:w-9"
            title={`${displayName} · ${roleLabel(role, locale)}`}
          >
            {getUserInitials(displayName)}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Mensajes sin responder para el contador de la campana.
 *
 * Solo lo consultan los roles que tienen acceso al Inbox: para el resto el
 * endpoint devolvería 403 y no tiene sentido preguntarlo. Refresco cada 60 s;
 * la señal instantánea vendrá de Supabase Realtime más adelante.
 */
function useSinResponder(role: string): number {
  const [total, setTotal] = useState(0);
  const anterior = useRef<number | null>(null);
  const puedeVer = role === "owner" || role === "manager";

  useEffect(() => {
    if (!puedeVer) return;
    let vivo = true;

    const cargar = async () => {
      try {
        const res = await fetch("/api/inbox/unread", { cache: "no-store" });
        if (!res.ok) return;
        const cuerpo = (await res.json()) as { total?: number; urgentes?: number };
        if (!vivo) return;

        const actual = cuerpo.total ?? 0;
        setTotal(actual);

        // Aviso del navegador si ha entrado algo nuevo con la pestaña de fondo.
        if (
          debeAvisar({
            anterior: anterior.current,
            actual,
            visible: document.visibilityState === "visible",
            permiso: typeof Notification !== "undefined" ? Notification.permission : "default",
            preferencia: preferenciaActiva(),
          })
        ) {
          lanzarAviso(actual - (anterior.current ?? 0), cuerpo.urgentes ?? 0);
        }
        anterior.current = actual;
      } catch {
        /* sin red: se reintenta en el siguiente ciclo */
      }
    };

    void cargar();
    const id = setInterval(() => void cargar(), 60_000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [puedeVer]);

  return puedeVer ? total : 0;
}
