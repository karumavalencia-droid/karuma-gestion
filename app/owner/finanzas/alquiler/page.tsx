"use client";

import { FinanceManager, fmtEuros } from "@/components/owner/FinanceManager";

export default function AlquilerPage() {
  return (
    <FinanceManager
      endpoint="/api/owner/finanzas/rent"
      title="Alquiler"
      fields={[
        { key: "period", label: "Periodo", kind: "month", required: true },
        { key: "concept", label: "Concepto", kind: "text", defaultValue: "Alquiler local" },
        { key: "amount_cents", label: "Importe (€)", kind: "euros", required: true },
        { key: "paid_on", label: "Pagado el", kind: "date" },
      ]}
      columns={[
        { label: "Periodo", render: (r) => String(r.period ?? "") },
        { label: "Concepto", render: (r) => String(r.concept ?? "") },
        { label: "Importe", align: "right", render: (r) => fmtEuros(r.amount_cents) },
        { label: "Pagado", render: (r) => String(r.paid_on ?? "—") },
      ]}
    />
  );
}
