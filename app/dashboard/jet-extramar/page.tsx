import { redirect } from "next/navigation";

/** La ficha del proveedor vive ahora en /compras/jet-extramar. */
export default function JetExtramarPage() {
  redirect("/compras/jet-extramar");
}
