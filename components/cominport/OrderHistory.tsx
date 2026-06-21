import { CalendarDays, History, RotateCcw } from "lucide-react";
import type { CominportOrder } from "@/src/data/cominportProducts";

interface OrderHistoryProps {
  orders: CominportOrder[];
  onAddAgain: (order: CominportOrder) => void;
}

function formatOrderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function OrderHistory({ orders, onAddAgain }: OrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
        <History className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">
          Aún no hay pedidos
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Los pedidos enviados por WhatsApp aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <CalendarDays className="h-4 w-4" />
                {formatOrderDate(order.fecha)}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {order.cantidadTotal} productos
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Enviado por WhatsApp
            </span>
          </div>

          <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {order.productos.map((product) => (
              <div
                key={`${order.id}-${product.codigo}`}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{product.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.codigo}</p>
                </div>
                <span className="shrink-0 font-semibold text-gray-700 dark:text-gray-200">
                  × {product.cantidad}
                </span>
              </div>
            ))}
          </div>

          {order.observaciones && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-200">Observaciones:</span>{" "}
              {order.observaciones}
            </p>
          )}

          <button
            type="button"
            onClick={() => onAddAgain(order)}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
            Añadir de nuevo al carrito
          </button>
        </article>
      ))}
    </section>
  );
}
