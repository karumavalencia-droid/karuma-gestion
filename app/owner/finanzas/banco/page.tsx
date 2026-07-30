"use client";

import { FinanceManager, fmtEuros } from "@/components/owner/FinanceManager";
import { maskAccount } from "@/lib/owner/mask";

export default function BancoPage() {
  return (
    <FinanceManager
      endpoint="/api/owner/finanzas/bank"
      title="Movimientos bancarios"
      fields={[
        { key: "booked_on", label: "Fecha", kind: "date", required: true },
        { key: "concept", label: "Concepto", kind: "text", required: true },
        {
          key: "direction",
          label: "Tipo",
          kind: "select",
          required: true,
          options: [
            { value: "in", label: "Entrada" },
            { value: "out", label: "Salida" },
          ],
        },
        { key: "account", label: "Cuenta (solo se guardan 4 dígitos)", kind: "text" },
        { key: "amount_cents", label: "Importe (€)", kind: "euros", required: true },
      ]}
      columns={[
        { label: "Fecha", render: (r) => String(r.booked_on ?? "") },
        { label: "Concepto", render: (r) => String(r.concept ?? "") },
        { label: "Tipo", render: (r) => (r.direction === "in" ? "Entrada" : "Salida") },
        { label: "Cuenta", render: (r) => maskAccount(r.account_last4 as string | null) },
        { label: "Importe", align: "right", render: (r) => fmtEuros(r.amount_cents) },
      ]}
    />
  );
}
