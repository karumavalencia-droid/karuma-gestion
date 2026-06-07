"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ceo": "CEO",
  "/ai-gerente": "AI Gerente",
  "/datos": "Datos",
  "/objetivo": "Objetivo 100K",
  "/pedidos": "Pedidos",
  "/inventario": "Inventario",
  "/personal": "Personal",
  "/finanzas": "Finanzas",
  "/profit": "Beneficio",
  "/reviews": "Reviews",
  "/marketing": "Marketing",
  "/cocina": "Cocina",
  "/configuracion": "Configuración",
  "/productos": "Productos",
  "/produccion": "Producción",
  "/empleados": "Empleados",
  "/turnos": "Turnos",
  "/delivery": "Delivery",
  "/delivery-center": "Delivery Center",
  "/compras": "Compras",
  "/food-cost": "Food Cost",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Karuma ERP";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
