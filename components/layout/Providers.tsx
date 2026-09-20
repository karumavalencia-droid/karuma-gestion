"use client";

import { usePathname } from "next/navigation";
import { CorreoObligatorio } from "@/components/portal/CorreoObligatorio";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { SidebarLayout } from "./SidebarLayout";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // El kiosco es la tablet del local (sin sesión personal) y /reservas es
  // público: ni barra lateral ni pantalla de correo.
  if (pathname.startsWith("/kiosk") || pathname.startsWith("/reservas")) {
    return <>{children}</>;
  }
  return (
    <SidebarLayout>
      <CorreoObligatorio />
      {children}
    </SidebarLayout>
  );
}

/** AuthProvider aporta la sesión a las páginas internas. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
