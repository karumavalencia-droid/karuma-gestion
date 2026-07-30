import { makeFinanceRoute } from "@/lib/owner/finance-route";
import {
  asAmountCents,
  asIsoDate,
  asOptionalString,
  asPeriod,
  asString,
} from "@/lib/owner/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = makeFinanceRoute({
  table: "rent_expenses",
  resource: "rent_expenses",
  orderBy: "period",
  parseCreate: (body) => {
    const period = asPeriod(body.period);
    const amount_cents = asAmountCents(body.amount_cents);
    if (!period) return { error: "Periodo (YYYY-MM) inválido." };
    if (amount_cents === null) return { error: "Importe inválido." };
    const paid_on = body.paid_on === undefined || body.paid_on === null || body.paid_on === ""
      ? null
      : asIsoDate(body.paid_on);
    if (body.paid_on && paid_on === null) return { error: "Fecha de pago inválida." };
    return {
      period,
      concept: asString(body.concept, 200) ?? "Alquiler local",
      amount_cents,
      paid_on,
      notes: asOptionalString(body.notes),
    };
  },
});

export const { GET, POST, DELETE } = route;
