import { Minus, Phone, Plus, Save, Send, ShoppingCart, Trash2 } from "lucide-react";
import type { CominportCartItem } from "@/src/data/cominportProducts";

interface CartProps {
  idPrefix?: string;
  supplierName?: string;
  items: CominportCartItem[];
  totalQuantity: number;
  observations: string;
  whatsappNumber: string;
  configMessage: string;
  onQuantityChange: (codigo: string, cantidad: number) => void;
  onRemove: (codigo: string) => void;
  onObservationsChange: (value: string) => void;
  onWhatsappNumberChange: (value: string) => void;
  onSaveWhatsappNumber: () => void;
  onSend: () => void;
}

export function Cart({
  idPrefix = "cominport-cart",
  supplierName = "proveedor",
  items,
  totalQuantity,
  observations,
  whatsappNumber,
  configMessage,
  onQuantityChange,
  onRemove,
  onObservationsChange,
  onWhatsappNumberChange,
  onSaveWhatsappNumber,
  onSend,
}: CartProps) {
  const canSend = items.length > 0 && whatsappNumber.replace(/\D/g, "").length >= 6;
  const observationsId = `${idPrefix}-observations`;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-karuma-600 dark:text-karuma-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Carrito</h2>
        </div>
        <span className="rounded-full bg-karuma-50 px-2.5 py-1 text-xs font-semibold text-karuma-700 dark:bg-karuma-950/50 dark:text-karuma-300">
          {totalQuantity} productos
        </span>
      </div>

      <div className="space-y-4 p-4">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
            <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Añade productos del catálogo para preparar el pedido.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.codigo}
                className="rounded-lg border border-gray-100 p-3 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.codigo} · {item.formato}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.codigo)}
                    className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(item.codigo, item.cantidad - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    aria-label={`Reducir cantidad de ${item.nombre}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    inputMode="numeric"
                    value={item.cantidad}
                    onChange={(event) =>
                      onQuantityChange(item.codigo, Number(event.target.value))
                    }
                    className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    aria-label={`Cantidad de ${item.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => onQuantityChange(item.codigo, item.cantidad + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label
            htmlFor={observationsId}
            className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            Observaciones
          </label>
          <textarea
            id={observationsId}
            rows={3}
            value={observations}
            onChange={(event) => onObservationsChange(event.target.value)}
            placeholder="Indicaciones para el proveedor…"
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
          <div className="mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Configuración de administrador
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <input
              type="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(event) => onWhatsappNumberChange(event.target.value)}
              placeholder="34600000000"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              aria-label={`Número de WhatsApp de ${supplierName}`}
            />
            <button
              type="button"
              onClick={onSaveWhatsappNumber}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Save className="h-4 w-4" />
              Guardar
            </button>
          </div>
          <p
            className={`mt-2 text-xs ${
              configMessage.startsWith("Número guardado")
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {configMessage || "Incluye el prefijo del país, sin espacios ni el símbolo +."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Enviar pedido por WhatsApp
        </button>
      </div>
    </section>
  );
}
