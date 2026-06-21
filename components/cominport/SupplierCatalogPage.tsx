"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Filter,
  Heart,
  History,
  PackageSearch,
  Search,
  ShoppingCart,
} from "lucide-react";
import { Cart } from "@/components/cominport/Cart";
import { Favorites } from "@/components/cominport/Favorites";
import { OrderHistory } from "@/components/cominport/OrderHistory";
import { ProductCard } from "@/components/cominport/ProductCard";
import type {
  CominportCartItem,
  CominportOrder,
  CominportProduct,
  CominportStockAlert,
} from "@/src/data/cominportProducts";

type Tab = "catalogo" | "favoritos" | "historial" | "carrito";
const CATALOG_PAGE_SIZE = 48;

interface SupplierCatalogPageProps {
  supplierName: string;
  storagePrefix: string;
  whatsappStorageKey: string;
  products: CominportProduct[];
  stockAlerts: CominportStockAlert[];
}

function readStoredArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // La página sigue operativa aunque el navegador bloquee localStorage.
  }
}

function createOrderId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildWhatsappMessage(
  items: CominportCartItem[],
  observations: string,
): string {
  const products = items
    .map(
      (item) =>
        `Código: ${item.codigo}\nProducto: ${item.nombre}\nCantidad: ${item.cantidad}`,
    )
    .join("\n\n");

  return `Hola,

Soy Karuma Valencia.

Quiero realizar el siguiente pedido:

${products}

Observaciones:
${observations.trim()}

⸻

Gracias.`;
}

export function SupplierCatalogPage({
  supplierName,
  storagePrefix,
  whatsappStorageKey,
  products,
  stockAlerts,
}: SupplierCatalogPageProps) {
  const favoritesStorageKey = `${storagePrefix}_favorites`;
  const historyStorageKey = `${storagePrefix}_order_history`;
  const [cart, setCart] = useState<CominportCartItem[]>([]);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [orders, setOrders] = useState<CominportOrder[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [observations, setObservations] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [activeTab, setActiveTab] = useState<Tab>("catalogo");
  const [configMessage, setConfigMessage] = useState("");
  const [toast, setToast] = useState("");
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);

  useEffect(() => {
    const validCodes = new Set(products.map((product) => product.codigo));
    const storedFavorites = readStoredArray<unknown>(favoritesStorageKey)
      .filter((value): value is string => typeof value === "string")
      .filter((codigo) => validCodes.has(codigo));

    setFavoriteCodes(storedFavorites);
    setOrders(readStoredArray<CominportOrder>(historyStorageKey));

    try {
      setWhatsappNumber(window.localStorage.getItem(whatsappStorageKey) ?? "");
    } catch {
      setWhatsappNumber("");
    }
  }, [favoritesStorageKey, historyStorageKey, products, whatsappStorageKey]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const categories = useMemo(
    () => [
      "Todas",
      ...Array.from(new Set(products.map((product) => product.categoria))).sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.categoria === category;
      const matchesSearch =
        !query ||
        product.nombre.toLocaleLowerCase("es").includes(query) ||
        product.codigo.toLocaleLowerCase("es").includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  useEffect(() => {
    setVisibleCount(CATALOG_PAGE_SIZE);
  }, [category, search]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const favoriteProducts = useMemo(() => {
    const favorites = new Set(favoriteCodes);
    return products.filter((product) => favorites.has(product.codigo));
  }, [favoriteCodes, products]);

  const lowStockCodes = useMemo(
    () => new Set(stockAlerts.map((alert) => alert.codigo)),
    [stockAlerts],
  );

  const totalQuantity = useMemo(
    () => cart.reduce((total, item) => total + item.cantidad, 0),
    [cart],
  );

  const addProduct = (product: CominportProduct, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.min(999, Math.floor(quantity)));
    setCart((current) => {
      const existing = current.find((item) => item.codigo === product.codigo);
      if (!existing) return [...current, { ...product, cantidad: safeQuantity }];
      return current.map((item) =>
        item.codigo === product.codigo
          ? { ...item, cantidad: Math.min(999, item.cantidad + safeQuantity) }
          : item,
      );
    });
    showToast(`${product.nombre} añadido al carrito`);
  };

  const addItems = (items: CominportCartItem[]) => {
    setCart((current) => {
      const next = [...current];
      items.forEach((item) => {
        const index = next.findIndex((currentItem) => currentItem.codigo === item.codigo);
        if (index === -1) {
          next.push({ ...item, cantidad: Math.max(1, Math.min(999, item.cantidad)) });
        } else {
          next[index] = {
            ...next[index],
            cantidad: Math.min(999, next[index].cantidad + item.cantidad),
          };
        }
      });
      return next;
    });
  };

  const updateQuantity = (codigo: string, quantity: number) => {
    const safeQuantity = Number.isFinite(quantity)
      ? Math.max(1, Math.min(999, Math.floor(quantity)))
      : 1;
    setCart((current) =>
      current.map((item) =>
        item.codigo === codigo ? { ...item, cantidad: safeQuantity } : item,
      ),
    );
  };

  const removeFromCart = (codigo: string) => {
    setCart((current) => current.filter((item) => item.codigo !== codigo));
  };

  const toggleFavorite = (codigo: string) => {
    setFavoriteCodes((current) => {
      const next = current.includes(codigo)
        ? current.filter((favoriteCode) => favoriteCode !== codigo)
        : [...current, codigo];
      saveStoredValue(favoritesStorageKey, next);
      return next;
    });
  };

  const addAllFavorites = () => {
    addItems(favoriteProducts.map((product) => ({ ...product, cantidad: 1 })));
    showToast("Lista habitual añadida al carrito");
  };

  const saveWhatsappNumber = () => {
    const normalized = whatsappNumber.replace(/\D/g, "");
    if (normalized.length < 6) {
      setConfigMessage("Introduce un número válido con prefijo de país.");
      return;
    }

    try {
      window.localStorage.setItem(whatsappStorageKey, normalized);
      setWhatsappNumber(normalized);
      setConfigMessage("Número guardado correctamente.");
    } catch {
      setConfigMessage("No se pudo guardar el número en este navegador.");
    }
  };

  const sendWhatsappOrder = () => {
    const normalizedNumber = whatsappNumber.replace(/\D/g, "");
    if (cart.length === 0) return;
    if (normalizedNumber.length < 6) {
      setConfigMessage("Guarda un número de WhatsApp válido antes de enviar.");
      return;
    }

    const message = buildWhatsappMessage(cart, observations);
    const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
    const order: CominportOrder = {
      id: createOrderId(storagePrefix),
      fecha: new Date().toISOString(),
      productos: cart.map((item) => ({ ...item })),
      cantidadTotal: totalQuantity,
      estado: "enviado_whatsapp",
      observaciones: observations.trim(),
    };
    const nextOrders = [order, ...orders].slice(0, 100);

    try {
      window.localStorage.setItem(whatsappStorageKey, normalizedNumber);
      setWhatsappNumber(normalizedNumber);
    } catch {
      // El envío puede continuar aunque el navegador no permita persistir el número.
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setOrders(nextOrders);
    saveStoredValue(historyStorageKey, nextOrders);
    setCart([]);
    setObservations("");
    showToast("Pedido guardado en el historial");
  };

  const addOrderAgain = (order: CominportOrder) => {
    addItems(order.productos);
    showToast("Pedido añadido de nuevo al carrito");
  };

  const cartProps = {
    items: cart,
    supplierName,
    totalQuantity,
    observations,
    whatsappNumber,
    configMessage,
    onQuantityChange: updateQuantity,
    onRemove: removeFromCart,
    onObservationsChange: setObservations,
    onWhatsappNumberChange: (value: string) => {
      setWhatsappNumber(value);
      setConfigMessage("");
    },
    onSaveWhatsappNumber: saveWhatsappNumber,
    onSend: sendWhatsappOrder,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-karuma-600 dark:text-karuma-400">
            Compras · {supplierName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Catálogo y pedidos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Busca productos, prepara la compra y envíala directamente por WhatsApp.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {products.length}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Catálogo</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {favoriteCodes.length}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Favoritos</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalQuantity}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">En carrito</p>
          </div>
        </div>
      </div>

      {stockAlerts.length > 0 && (
        <section className="space-y-2">
          {stockAlerts.map((alert) => {
            const product = products.find((item) => item.codigo === alert.codigo);
            if (!product) return null;
            return (
              <div
                key={alert.codigo}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {alert.mensaje}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {product.nombre} · Stock {alert.stockActual}/{alert.stockMinimo}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="min-h-10 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Añadir al carrito de compra
                </button>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por producto o código…"
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-1 rounded-xl bg-gray-200 p-1 lg:hidden dark:bg-gray-800">
        {(
          [
            ["catalogo", "Catálogo", PackageSearch, filteredProducts.length],
            ["favoritos", "Favoritos", Heart, favoriteCodes.length],
            ["historial", "Historial", History, orders.length],
            ["carrito", "Carrito", ShoppingCart, totalQuantity],
          ] as const
        ).map(([tab, label, Icon, count]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-karuma-700 shadow-sm dark:bg-gray-900 dark:text-karuma-300"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            <span className="relative">
              <Icon className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-karuma-600 px-1 text-[9px] leading-4 text-white">
                  {count}
                </span>
              )}
            </span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
        <div className="min-w-0">
          <nav className="mb-4 hidden gap-1 rounded-xl bg-gray-200 p-1 lg:grid lg:grid-cols-3 dark:bg-gray-800">
            {(
              [
                ["catalogo", "Catálogo", filteredProducts.length],
                ["favoritos", "Lista habitual", favoriteCodes.length],
                ["historial", "Historial", orders.length],
              ] as const
            ).map(([tab, label, count]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab || (activeTab === "carrito" && tab === "catalogo")
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </nav>

          <div
            className={
              activeTab === "catalogo"
                ? "block"
                : activeTab === "carrito"
                  ? "hidden lg:block"
                  : "hidden"
            }
          >
            {filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <PackageSearch className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 font-medium text-gray-900 dark:text-white">
                  No hay productos para esta búsqueda
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("Todas");
                  }}
                  className="mt-3 text-sm font-medium text-karuma-600 hover:text-karuma-700 dark:text-karuma-400"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando {visibleProducts.length} de {filteredProducts.length} productos
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.codigo}
                      product={product}
                      isFavorite={favoriteCodes.includes(product.codigo)}
                      lowStock={lowStockCodes.has(product.codigo)}
                      onAdd={addProduct}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
                {visibleProducts.length < filteredProducts.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + CATALOG_PAGE_SIZE, filteredProducts.length),
                      )
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Mostrar más ({filteredProducts.length - visibleProducts.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={activeTab === "favoritos" ? "block" : "hidden"}>
            <Favorites
              products={favoriteProducts}
              onAdd={addProduct}
              onAddAll={addAllFavorites}
              onRemove={toggleFavorite}
            />
          </div>

          <div className={activeTab === "historial" ? "block" : "hidden"}>
            <OrderHistory orders={orders} onAddAgain={addOrderAgain} />
          </div>

          <div className={activeTab === "carrito" ? "block lg:hidden" : "hidden"}>
            <Cart idPrefix={`${storagePrefix}-mobile`} {...cartProps} />
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-5 lg:block">
          <Cart idPrefix={`${storagePrefix}-desktop`} {...cartProps} />
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-gray-900"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
