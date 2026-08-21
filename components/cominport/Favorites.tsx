import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import type { CominportProduct } from "@/src/data/cominportProducts";
import { getCominportInvoiceMeta } from "@/src/data/cominportInvoiceRanking";

interface FavoritesProps {
  products: CominportProduct[];
  onAdd: (product: CominportProduct) => void;
  onAddAll: () => void;
  onRemove: (codigo: string) => void;
}

export function Favorites({ products, onAdd, onAddAll, onRemove }: FavoritesProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
        <Heart className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">Sin productos guardados</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pulsa el corazón de un producto para crear tu lista habitual.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
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

      <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {products.map((product) => {
          const invoiceMeta = getCominportInvoiceMeta(product.codigo);
          const secondaryDetails = [
            product.nombreEs && product.nombreEs !== product.nombre ? product.nombre : null,
            product.formato,
            invoiceMeta?.unidadPedido,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <article
              key={product.codigo}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-[11px] font-semibold text-karuma-600 dark:text-karuma-400">
                    {product.codigo}
                  </span>
                  <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {product.nombreEs ?? product.nombre}
                  </h3>
                </div>
                {secondaryDetails && (
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {secondaryDetails}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-karuma-600 text-white hover:bg-karuma-700"
                aria-label={`Añadir ${product.nombreEs ?? product.nombre} al carrito`}
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(product.codigo)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-red-950/40"
                aria-label={`Quitar ${product.nombreEs ?? product.nombre} de favoritos`}
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
