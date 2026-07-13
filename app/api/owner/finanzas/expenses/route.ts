import { makeFinanceRoute } from "@/lib/owner/finance-route";
import {
  asAmountCents,
  asIsoDate,
  asOptionalString,
  asString,
} from "@/lib/owner/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = makeFinanceRoute({
  table: "private_expenses",
  resource: "private_expenses",
  orderBy: "spent_on",
  parseCreate: (body) => {
    const spent_on = asIsoDate(body.spent_on);
    const category = asString(body.category, 100);
    const concept = asString(body.concept);
    const amount_cents = asAmountCents(body.amount_cents);
    if (!spent_on) return { error: "Fecha inválida." };
    if (!category) return { error: "Categoría obligatoria." };
    if (!concept) return { error: "Concepto obligatorio." };
    if (amount_cents === null) return { error: "Importe inválido." };
    return { spent_on, category, concept, amount_cents, notes: asOptionalString(body.notes) };
  },
});

export const { GET, POST, DELETE } = route;
