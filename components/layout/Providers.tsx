"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { SidebarLayout } from "./SidebarLayout";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/kiosk") || pathname.startsWith("/reservas")) {
    return <>{children}</>;
  }
  return <SidebarLayout>{children}</SidebarLayout>;
}

/** AuthProvider 仅保留给 /login，主界面不依赖登录状态 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppShell>{children}</AppShell>
      </LanguageProvider>
    </AuthProvider>
  );
}
