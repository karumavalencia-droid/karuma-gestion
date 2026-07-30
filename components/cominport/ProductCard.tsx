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
 * Ficha compacta: dos líneas por producto para ver el máximo de referencias sin
 * hacer scroll. Arriba código y nombre; abajo nombre en español, formato y el
 * resto de datos. No se quita ninguna información, solo se aprieta.
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

  return (
    // min-w-0: como celda de la rejilla su mínimo es el del contenido, y sin
    // esto los nombres largos ensanchan la ficha y sacan los botones de la
    // pantalla en el móvil en vez de recortarse.
    <article className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-karuma-600">
            {product.codigo}
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900">
            {product.nombre}
          </h3>
        </div>

        {/* Todo lo demás en una sola línea: el español que pidió el jefe sigue
            estando, y los datos de factura ya no gastan una tercera línea. */}
        <p className="mt-0.5 truncate text-[11px] text-gray-500">
          {product.nombreEs && <span>{product.nombreEs}</span>}
          {product.nombreEs && product.formato && <span> · </span>}
          {product.formato && <span>{product.formato}</span>}
          {invoiceMeta && (
            <span className="font-medium text-karuma-700">
              {" "}
              · {invoiceMeta.unidadPedido}
            </span>
          )}
          {invoiceMeta && (
            <span>
              {" "}
              · {invoiceMeta.pedidosFactura}× fra.
            </span>
          )}
          {orderedUsage && (
            <span className="font-medium text-karuma-700">
              {" "}
              · <RotateCcw className="inline h-3 w-3 align-[-2px]" />{" "}
              {orderedUsage.veces}×
            </span>
          )}
          {lowStock && (
            <span className="font-medium text-amber-700">
              {" "}
              · <AlertTriangle className="inline h-3 w-3 align-[-2px]" /> Casi agotado
            </span>
          )}
        </p>
      </div>

      {typeof precio === "number" && precio > 0 && (
        <p className="shrink-0 text-sm font-bold text-karuma-600">
          €{precio.toFixed(2)}
        </p>
      )}

      <button
        type="button"
        onClick={() => onToggleFavorite(product.codigo)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-karuma-600 text-white transition-colors hover:bg-karuma-700 active:bg-karuma-800"
        aria-label={`Añadir ${product.nombre} al carrito`}
      >
        <Plus className="h-5 w-5" />
      </button>
    </article>
  );
}
