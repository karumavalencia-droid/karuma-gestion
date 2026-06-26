"use client";

import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export function NoPermission() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Sin permiso de acceso</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        La cuenta actual
        {user ? ` (${user.name} · ${ROLE_LABELS[user.role]})` : ""}
        no tiene permiso para acceder a esta página. Contacta con gerencia para activar el acceso.
      </p>
    </div>
  );
}
