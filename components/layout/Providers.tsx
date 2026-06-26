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

/** AuthProvider aporta la sesión a las páginas internas. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppShell>{children}</AppShell>
      </LanguageProvider>
    </AuthProvider>
  );
}
