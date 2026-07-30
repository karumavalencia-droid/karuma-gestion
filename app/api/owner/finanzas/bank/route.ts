import { makeFinanceRoute } from "@/lib/owner/finance-route";
import {
  asAmountCents,
  asEnum,
  asIsoDate,
  asOptionalString,
  asString,
} from "@/lib/owner/validation";
import { keepLast4 } from "@/lib/owner/mask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = makeFinanceRoute({
  table: "bank_transactions",
  resource: "bank_transactions",
  orderBy: "booked_on",
  parseCreate: (body) => {
    const booked_on = asIsoDate(body.booked_on);
    const concept = asString(body.concept);
    const amount_cents = asAmountCents(body.amount_cents);
    const direction = asEnum(body.direction, ["in", "out"] as const);
    if (!booked_on) return { error: "Fecha inválida." };
    if (!concept) return { error: "Concepto obligatorio." };
    if (amount_cents === null) return { error: "Importe inválido." };
    if (!direction) return { error: "Tipo (in/out) inválido." };
    return {
      booked_on,
      concept,
      counterparty: asOptionalString(body.counterparty, 200),
      // Solo se conservan los últimos 4 dígitos de la cuenta.
      account_last4: keepLast4(typeof body.account === "string" ? body.account : null),
      amount_cents,
      direction,
      notes: asOptionalString(body.notes),
    };
  },
});

export const { GET, POST, DELETE } = route;
