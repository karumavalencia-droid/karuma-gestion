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

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 rounded-lg bg-gray-100 p-2 text-gray-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {value ? (
          href ? (
            <a
              href={href}
              className="block break-words text-sm font-medium text-karuma-700 underline-offset-2 hover:underline"
            >
              {value}
            </a>
          ) : (
            <p className="break-words text-sm font-medium text-gray-900">{value}</p>
          )
        ) : (
          <p className="text-sm text-gray-400">Sin datos</p>
        )}
      </div>
    </div>
  );
}

export function SupplierDetail({ supplier }: { supplier: CoreSupplier }) {
  const Catalog = supplier.tieneCatalogo ? CATALOGS[supplier.slug] : null;

  return (
    <div className="space-y-5">
      <Link
        href="/compras"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos los proveedores
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-karuma-600">Proveedor</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              {supplierFullName(supplier)}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{supplier.categoria}</p>
          </div>
          <StatusBadge variant="success">Activo</StatusBadge>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <ContactRow icon={User} label="Contacto" value={supplier.contacto} />
          <ContactRow
            icon={Phone}
            label="Teléfono"
            value={supplier.telefono}
            href={supplier.telefono ? `tel:${supplier.telefono.replace(/\s/g, "")}` : undefined}
          />
          <ContactRow
            icon={Mail}
            label="Email"
            value={supplier.email}
            href={supplier.email ? `mailto:${supplier.email}` : undefined}
          />
          <ContactRow
            icon={MessageCircle}
            label="WhatsApp"
            value={supplier.whatsapp ? `+${supplier.whatsapp}` : ""}
            href={supplier.whatsapp ? `https://wa.me/${supplier.whatsapp}` : undefined}
          />
        </div>
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
