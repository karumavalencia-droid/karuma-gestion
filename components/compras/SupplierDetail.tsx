"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowLeft, Mail, MessageCircle, Phone, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  supplierFullName,
  type CoreSupplier,
  type SupplierSlug,
} from "@/lib/compras/suppliers";

function CatalogSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
      Cargando catálogo…
    </div>
  );
}

/**
 * Cada catálogo se carga solo cuando se abre su ficha: los cuatro juntos son
 * más de 12.000 líneas de datos y no tiene sentido mandarlos siempre.
 */
const CATALOGS: Record<SupplierSlug, ComponentType> = {
  cominport: dynamic(() => import("./catalogs/CominportCatalog"), {
    loading: CatalogSkeleton,
  }),
  "jet-extramar": dynamic(() => import("./catalogs/JetExtramarCatalog"), {
    loading: CatalogSkeleton,
  }),
  kanyo: dynamic(() => import("./catalogs/KanyoCatalog"), {
    loading: CatalogSkeleton,
  }),
  yongxing: dynamic(() => import("./catalogs/YongxingCatalog"), {
    loading: CatalogSkeleton,
  }),
};

/** Dato de contacto en una línea. Si no lo tenemos, no ocupa sitio. */
function ContactChip({
  icon: Icon,
  value,
  href,
}: {
  icon: typeof Phone;
  value: string;
  href?: string;
}) {
  if (!value) return null;

  const contenido = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="truncate">{value}</span>
    </>
  );

  return href ? (
    <a
      href={href}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 text-sm text-karuma-700 underline-offset-2 hover:underline"
    >
      {contenido}
    </a>
  ) : (
    <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 text-sm text-gray-600">
      {contenido}
    </span>
  );
}

export function SupplierDetail({ supplier }: { supplier: CoreSupplier }) {
  const Catalog = supplier.tieneCatalogo ? CATALOGS[supplier.slug] : null;
  const tieneContacto = Boolean(
    supplier.contacto || supplier.telefono || supplier.email || supplier.whatsapp,
  );

  return (
    <div className="space-y-5">
      <Link
        href="/compras"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos los proveedores
      </Link>

      {/* Cabecera compacta: el sitio manda para los productos, no para la ficha. */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {supplierFullName(supplier)}
          </h1>
          <span className="text-xs text-gray-500">{supplier.categoria}</span>
          <StatusBadge variant="success">Activo</StatusBadge>
        </div>

        {tieneContacto ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <ContactChip icon={User} value={supplier.contacto} />
            <ContactChip
              icon={Phone}
              value={supplier.telefono}
              href={supplier.telefono ? `tel:${supplier.telefono.replace(/\s/g, "")}` : undefined}
            />
            <ContactChip
              icon={Mail}
              value={supplier.email}
              href={supplier.email ? `mailto:${supplier.email}` : undefined}
            />
            <ContactChip
              icon={MessageCircle}
              value={supplier.whatsapp ? `+${supplier.whatsapp}` : ""}
              href={supplier.whatsapp ? `https://wa.me/${supplier.whatsapp}` : undefined}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-400">Sin datos de contacto</p>
        )}
      </div>

      {Catalog ? (
        <Catalog />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-900">Sin catálogo de productos</p>
          <p className="mt-1 text-sm text-gray-500">
            暂无商品目录 · Todavía no hemos cargado los productos de {supplier.nombre}.
          </p>
        </div>
      )}
    </div>
  );
}
