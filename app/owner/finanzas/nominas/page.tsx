"use client";

import { FinanceManager, fmtEuros } from "@/components/owner/FinanceManager";

export default function NominasPage() {
  return (
    <FinanceManager
      endpoint="/api/owner/finanzas/payroll"
      title="Nóminas"
      fields={[
        { key: "period", label: "Periodo", kind: "month", required: true },
        { key: "employee_label", label: "Empleado", kind: "text", required: true },
        { key: "gross_cents", label: "Bruto (€)", kind: "euros", required: true },
        { key: "net_cents", label: "Neto (€)", kind: "euros", required: true },
        { key: "cost_cents", label: "Coste empresa (€)", kind: "euros" },
      ]}
      columns={[
        { label: "Periodo", render: (r) => String(r.period ?? "") },
        { label: "Empleado", render: (r) => String(r.employee_label ?? "") },
        { label: "Bruto", align: "right", render: (r) => fmtEuros(r.gross_cents) },
        { label: "Neto", align: "right", render: (r) => fmtEuros(r.net_cents) },
        { label: "Coste", align: "right", render: (r) => fmtEuros(r.cost_cents) },
      ]}
    />
  );
}
