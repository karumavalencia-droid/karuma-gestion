import { AlertTriangle, Heart, Plus } from "lucide-react";
import type { CominportProduct } from "@/src/data/cominportProducts";

interface ProductCardProps {
  product: CominportProduct;
  isFavorite: boolean;
  lowStock?: boolean;
  onAdd: (product: CominportProduct) => void;
  onToggleFavorite: (codigo: string) => void;
}

export function ProductCard({
  product,
  isFavorite,
  lowStock = false,
  onAdd,
  onToggleFavorite,
}: ProductCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-karuma-600 dark:text-karuma-400">
            {product.codigo}
          </p>
          <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
            {product.nombre}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(product.codigo)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            isFavorite
              ? "bg-red-50 text-karuma-600 dark:bg-red-950/40 dark:text-karuma-400"
              : "bg-gray-100 text-gray-500 hover:text-karuma-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
          aria-label={
            isFavorite ? `Quitar ${product.nombre} de favoritos` : `Guardar ${product.nombre}`
          }
          aria-pressed={isFavorite}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex-1">
        <p className="text-sm text-gray-600 dark:text-gray-300">{product.formato}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{product.categoria}</p>
        {lowStock && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Producto próximo a agotarse
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(product)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-karuma-700 active:bg-karuma-800"
      >
        <Plus className="h-4 w-4" />
        Añadir al carrito
      </button>
    </article>
  );
}
