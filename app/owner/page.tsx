import Link from "next/link";
import { Banknote, FileLock2, ShieldCheck, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

const CARDS = [
  { href: "/owner/finanzas", title: "Finanzas privadas", desc: "Resumen y documentos", icon: Wallet },
  { href: "/owner/finanzas/banco", title: "Banco", desc: "Movimientos bancarios", icon: Banknote },
  { href: "/owner/finanzas/nominas", title: "Nóminas", desc: "Coste de personal", icon: FileLock2 },
  { href: "/owner/security", title: "Seguridad", desc: "MFA y auditoría", icon: ShieldCheck },
];

export default function OwnerHomePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Zona del propietario</h1>
        <p className="mt-1 text-sm text-gray-500">
          Área privada protegida con verificación en dos pasos. Solo tú, con MFA activo.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-karuma-300"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
