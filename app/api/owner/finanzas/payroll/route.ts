import { makeFinanceRoute } from "@/lib/owner/finance-route";
import {
  asAmountCents,
  asOptionalString,
  asPeriod,
  asString,
} from "@/lib/owner/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = makeFinanceRoute({
  table: "payroll_records",
  resource: "payroll_records",
  orderBy: "period",
  parseCreate: (body) => {
    const period = asPeriod(body.period);
    const employee_label = asString(body.employee_label, 200);
    const gross_cents = asAmountCents(body.gross_cents);
    const net_cents = asAmountCents(body.net_cents);
    if (!period) return { error: "Periodo (YYYY-MM) inválido." };
    if (!employee_label) return { error: "Etiqueta de empleado obligatoria." };
    if (gross_cents === null || net_cents === null) return { error: "Importes inválidos." };
    const cost_cents = body.cost_cents === undefined ? null : asAmountCents(body.cost_cents);
    if (body.cost_cents !== undefined && cost_cents === null) {
      return { error: "Coste inválido." };
    }
    return {
      period,
      employee_label,
      gross_cents,
      net_cents,
      cost_cents,
      notes: asOptionalString(body.notes),
    };
  },
});

export const { GET, POST, DELETE } = route;
