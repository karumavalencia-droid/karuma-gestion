import { redirect } from "next/navigation";

/** La ficha del proveedor vive ahora en /compras/cominport. */
export default function CominportPage() {
  redirect("/compras/cominport");
}
