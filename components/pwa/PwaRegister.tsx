"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function clearServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
  void caches.keys().then((keys) => {
    for (const key of keys) void caches.delete(key);
  });
}

/** 开发环境 /kiosk 禁用 SW，避免样式与页面被离线缓存干扰 */
export function PwaRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (process.env.NODE_ENV === "development" || pathname.startsWith("/kiosk")) {
      clearServiceWorker();
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registro opcional — no bloquear la app */
      });
    }
  }, [pathname]);

  return null;
}
