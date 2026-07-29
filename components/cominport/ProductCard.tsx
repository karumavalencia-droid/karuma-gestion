import { AlertTriangle, Heart, Plus, RotateCcw } from "lucide-react";
import type {
  CominportProduct,
  SupplierOrderedUsage,
} from "@/src/data/cominportProducts";
import type { InvoiceMetaLookup } from "@/src/data/cominportInvoiceRanking";
import { getCominportInvoiceMeta } from "@/src/data/cominportInvoiceRanking";
import cominportPrices from "@/src/data/cominportPrices.json";

interface ProductCardProps {
  product: CominportProduct;
  isFavorite: boolean;
  lowStock?: boolean;
  /** Pedidos previos de esta referencia hechos desde el panel. */
  orderedUsage?: SupplierOrderedUsage;
  /** Histórico de facturas del proveedor que se está mostrando. */
  getInvoiceMeta?: InvoiceMetaLookup;
  onAdd: (product: CominportProduct) => void;
  onToggleFavorite: (codigo: string) => void;
}

/**
 * Ficha compacta: una fila por producto para ver el máximo de referencias sin
 * hacer scroll. Toda la información sigue estando, en menos alto.
 */
export function ProductCard({
  product,
  isFavorite,
  lowStock = false,
  orderedUsage,
  getInvoiceMeta = getCominportInvoiceMeta,
  onAdd,
  onToggleFavorite,
}: ProductCardProps) {
  const invoiceMeta = getInvoiceMeta(product.codigo);
  const precio =
    product.precio ?? cominportPrices[product.codigo as keyof typeof cominportPrices];

  // Segunda línea: nombre en español y formato. La categoría no entra: se corta
  // lo que de verdad hace falta para pedir y además ya se filtra por ella.
  const subtitulo = [product.nombreEs, product.formato].filter(Boolean).join(" · ");

  return (
    // min-w-0: como celda de la rejilla su mínimo es el del contenido, y sin
    // esto los nombres largos ensanchan la ficha y sacan los botones de la
    // pantalla en el móvil en vez de recortarse.
    <article className="flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-karuma-600">
            {product.codigo}
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900">
            {product.nombre}
          </h3>
        </div>

        {subtitulo && <p className="truncate text-xs text-gray-500">{subtitulo}</p>}

        {(invoiceMeta || orderedUsage || lowStock) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            {invoiceMeta && (
              <span className="font-medium text-karuma-700">
                Ud. pedido: {invoiceMeta.unidadPedido}
              </span>
            )}
            {invoiceMeta && (
              <span className="text-gray-400">
                {invoiceMeta.pedidosFactura}× facturas · {invoiceMeta.cantidadFactura} uds.
              </span>
            )}
            {orderedUsage && (
              <span className="inline-flex items-center gap-1 font-medium text-karuma-700">
                <RotateCcw className="h-3 w-3" />
                {orderedUsage.veces}× · {orderedUsage.unidades} uds.
              </span>
            )}
            {lowStock && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Casi agotado
              </span>
            )}
          </p>
        )}
      </div>

      {typeof precio === "number" && precio > 0 && (
        <p className="shrink-0 text-sm font-bold text-karuma-600">
          €{precio.toFixed(2)}
        </p>
      )}

      <button
        type="button"
        onClick={() => onToggleFavorite(product.codigo)}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          isFavorite
            ? "bg-red-50 text-karuma-600"
            : "bg-gray-100 text-gray-500 hover:text-karuma-600"
        }`}
        aria-label={
          isFavorite ? `Quitar ${product.nombre} de favoritos` : `Guardar ${product.nombre}`
        }
        aria-pressed={isFavorite}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      </button>

      <button
        type="button"
        onClick={() => onAdd(product)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-karuma-600 text-white transition-colors hover:bg-karuma-700 active:bg-karuma-800"
        aria-label={`Añadir ${product.nombre} al carrito`}
      >
        <Plus className="h-5 w-5" />
      </button>
    </article>
  );
}
