import { redirect } from "next/navigation";

/** Kankyo = Kanyo. La ficha del proveedor vive ahora en /compras/kanyo. */
export default function KankyoPage() {
  redirect("/compras/kanyo");
}
