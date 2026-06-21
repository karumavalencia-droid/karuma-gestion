import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import type { CominportProduct } from "@/src/data/cominportProducts";

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

      <div className="space-y-2">
        {products.map((product) => (
          <article
            key={product.codigo}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-karuma-600 dark:text-karuma-400">
                {product.codigo}
              </p>
              <h3 className="font-semibold text-gray-900 dark:text-white">{product.nombre}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{product.formato}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-karuma-600 px-3 py-2 text-sm font-medium text-white hover:bg-karuma-700 sm:flex-none"
              >
                <ShoppingCart className="h-4 w-4" />
                Añadir
              </button>
              <button
                type="button"
                onClick={() => onRemove(product.codigo)}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-red-950/40"
                aria-label={`Quitar ${product.nombre} de favoritos`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
