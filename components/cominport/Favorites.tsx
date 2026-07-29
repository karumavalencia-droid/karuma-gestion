import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import type { CominportProduct } from "@/src/data/cominportProducts";
import type { InvoiceMetaLookup } from "@/src/data/cominportInvoiceRanking";
import { getCominportInvoiceMeta } from "@/src/data/cominportInvoiceRanking";

interface FavoritesProps {
  products: CominportProduct[];
  onAdd: (product: CominportProduct) => void;
  onAddAll: () => void;
  onRemove: (codigo: string) => void;
  getInvoiceMeta?: InvoiceMetaLookup;
}

export function Favorites({
  products,
  onAdd,
  onAddAll,
  onRemove,
  getInvoiceMeta = getCominportInvoiceMeta,
}: FavoritesProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
        <Heart className="mx-auto h-9 w-9 text-gray-300" />
        <h2 className="mt-3 font-semibold text-gray-900">Sin productos guardados</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pulsa el corazón de un producto para crear tu lista habitual.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {products.length} productos en tu lista habitual
        </p>
        <button
          type="button"
          onClick={onAddAll}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-karuma-700"
        >
          <ShoppingCart className="h-4 w-4" />
          Añadir todos al carrito
        </button>
      </div>

      {/* Una fila por producto, también en el móvil: así entra el máximo de
          referencias en pantalla sin perder ningún dato. */}
      <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {products.map((product) => {
          const invoiceMeta = getInvoiceMeta(product.codigo);
          const subtitulo = [product.nombreEs, product.formato]
            .filter(Boolean)
            .join(" · ");

          return (
            <article
              key={product.codigo}
              // min-w-0: sin esto un nombre largo ensancha la celda de la
              // rejilla y saca los botones fuera de la pantalla en el móvil.
              className="flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-[11px] font-semibold text-karuma-600">
                    {product.codigo}
                  </span>
                  <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900">
                    {product.nombre}
                  </h3>
                </div>
                {subtitulo && (
                  <p className="truncate text-xs text-gray-500">{subtitulo}</p>
                )}
                {invoiceMeta && (
                  <p className="truncate text-[11px] font-medium text-karuma-700">
                    Ud. pedido: {invoiceMeta.unidadPedido}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-karuma-600 text-white hover:bg-karuma-700"
                aria-label={`Añadir ${product.nombre} al carrito`}
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(product.codigo)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar ${product.nombre} de favoritos`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
