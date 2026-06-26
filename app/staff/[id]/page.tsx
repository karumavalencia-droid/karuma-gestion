"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatContractHours, formatStaffStatus, formatStandardShift } from "@/lib/staff/format";
import { formatFixedRestDays } from "@/lib/staff/rest-days";
import type { StaffMember } from "@/lib/staff/types";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-4 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 sm:text-right">{value}</dd>
    </div>
  );
}

export default function StaffDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/${id}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "No se pudo cargar");
      }
      setMember((await res.json()) as StaffMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar");
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/staff"
          className="text-sm font-medium text-karuma-600 hover:text-karuma-700"
        >
          ← Volver al equipo
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : member ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h1 className="text-lg font-semibold text-gray-900">{member.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{member.department}</p>
          </div>
          <dl className="px-6">
            <DetailRow label="Nombre" value={member.name} />
            <DetailRow label="Departamento" value={member.department} />
            <DetailRow label="Puesto" value={member.position} />
            <DetailRow label="Horas de contrato" value={formatContractHours(member.weeklyHours)} />
            <DetailRow label="Descansos fijos" value={formatFixedRestDays(member)} />
            <DetailRow label="Turno estándar" value={formatStandardShift(member.fixedShift)} />
            <DetailRow label="Estado" value={formatStaffStatus(member.status)} />
          </dl>
        </div>
      ) : null}
    </div>
  );
}
