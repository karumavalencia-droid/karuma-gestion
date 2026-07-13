"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface SessionInfo {
  email: string | null;
  aal: string | null;
  hasVerifiedFactor: boolean;
}
interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  created_at: string;
}

export default function OwnerSecurityPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  useEffect(() => {
    fetch("/api/owner/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSession(d))
      .catch(() => null);
    fetch("/api/owner/audit", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAudit(d.items ?? []))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Seguridad</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Verificación en dos pasos</h2>
        </div>
        <p className="text-sm text-gray-600">
          Cuenta: <span className="font-medium">{session?.email ?? "…"}</span>
        </p>
        <p className="text-sm text-gray-600">
          Nivel de seguridad de la sesión:{" "}
          <span className="font-medium">{session?.aal ?? "…"}</span>
        </p>
        <p className="text-sm text-gray-600">
          MFA registrado: {session?.hasVerifiedFactor ? "Sí" : "No"}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-gray-900">Registro de auditoría (últimas acciones)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Acción</th>
                <th className="px-2 py-2">Recurso</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-center text-gray-400">
                    Sin registros aún.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="px-2 py-2 text-gray-600">
                    {new Date(a.created_at).toLocaleString("es-ES")}
                  </td>
                  <td className="px-2 py-2">{a.action}</td>
                  <td className="px-2 py-2 text-gray-600">{a.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
