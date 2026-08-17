import { ComprasPanel } from "@/components/compras/ComprasPanel";

export default function PurchasesPage() {
  // /purchases is the legacy English route. Keep it as an alias of the
  // complete Spanish purchasing module so supplier data is not split between
  // two different screens.
  return <ComprasPanel />;
}
