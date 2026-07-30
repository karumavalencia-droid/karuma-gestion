"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Filter,
  Heart,
  History,
  ListOrdered,
  PackageSearch,
  Search,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { Cart } from "@/components/cominport/Cart";
import { Favorites } from "@/components/cominport/Favorites";
import { OrderHistory } from "@/components/cominport/OrderHistory";
import { ProductCard } from "@/components/cominport/ProductCard";
import type { InvoiceMetaLookup } from "@/src/data/cominportInvoiceRanking";
import { getCominportInvoiceMeta } from "@/src/data/cominportInvoiceRanking";
import type {
  CominportCartItem,
  CominportOrder,
  CominportProduct,
  CominportStockAlert,
  SupplierOrderedUsage,
} from "@/src/data/cominportProducts";

type Tab = "catalogo" | "ranking" | "favoritos" | "historial" | "carrito";
// Las fichas son de una fila, así que cabe el triple por pantalla: cargamos
// más de golpe para tener que pulsar "Mostrar más" muchas menos veces.
const CATALOG_PAGE_SIZE = 120;

interface SupplierCatalogPageProps {
  supplierName: string;
  storagePrefix: string;
  whatsappStorageKey: string;
  /** Número usado si no hay ninguno guardado en este navegador. */
  defaultWhatsappNumber?: string;
  /** Email usado si no hay ninguno guardado en este navegador. */
  defaultEmail?: string;
  products: CominportProduct[];
  stockAlerts: CominportStockAlert[];
  /**
   * Lista habitual compartida del restaurante: son los favoritos que ve
   * cualquier compañero la primera vez que abre el catálogo en su navegador.
   * A partir de ahí manda lo que cada uno guarde o quite.
   */
  defaultFavorites?: string[];
  /** Histórico de facturas de este proveedor; por defecto, el de Cominport. */
  getInvoiceMeta?: InvoiceMetaLookup;
}

/** Referencia estable: se usa como dep del efecto de hidratación. */
const NO_DEFAULT_FAVORITES: string[] = [];

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

/** Distingue "nunca se guardó nada" de "se guardó una lista vacía". */
function hasStoredValue(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function readStoredString(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function saveStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // La página sigue operativa aunque el navegador bloquee localStorage.
  }
}

function saveStoredString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // La página sigue operativa aunque el navegador bloquee localStorage.
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** El carrito guardado puede venir de una versión anterior: se valida antes de usarlo. */
function normalizeStoredCart(
  stored: unknown[],
  products: CominportProduct[],
): CominportCartItem[] {
  const byCode = new Map(products.map((product) => [product.codigo, product]));
  const seen = new Set<string>();
  const items: CominportCartItem[] = [];

  stored.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Record<string, unknown>;
    const codigo = typeof item.codigo === "string" ? item.codigo : "";
    const product = byCode.get(codigo);
    // Se descartan códigos que ya no existen en el catálogo actual.
    if (!product || seen.has(codigo)) return;
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad)) return;
    seen.add(codigo);
    items.push({
      ...product,
      cantidad: Math.max(1, Math.min(999, Math.floor(cantidad))),
    });
  });

  return items;
}

function buildOrderedUsage(
  orders: CominportOrder[],
): Map<string, SupplierOrderedUsage> {
  const usage = new Map<string, SupplierOrderedUsage>();

  orders.forEach((order) => {
    if (!Array.isArray(order?.productos)) return;
    order.productos.forEach((item) => {
      if (!item || typeof item.codigo !== "string") return;
      const current = usage.get(item.codigo) ?? { veces: 0, unidades: 0 };
      const cantidad = Number(item.cantidad);
      usage.set(item.codigo, {
        veces: current.veces + 1,
        unidades: current.unidades + (Number.isFinite(cantidad) ? cantidad : 0),
      });
    });
  });

  return usage;
}

/**
 * Deja delante lo que ya se ha pedido antes (más veces primero) y mantiene
 * el orden original para el resto: el catálogo llega ya ordenado por proveedor.
 */
function rankByOwnOrders(
  products: CominportProduct[],
  usage: Map<string, SupplierOrderedUsage>,
): CominportProduct[] {
  if (usage.size === 0) return products;

  return [...products].sort((a, b) => {
    const aUsage = usage.get(a.codigo);
    const bUsage = usage.get(b.codigo);

    if (aUsage && bUsage) {
      return bUsage.veces - aUsage.veces || bUsage.unidades - aUsage.unidades;
    }
    if (aUsage) return -1;
    if (bUsage) return 1;
    return 0;
  });
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
  getInvoiceMeta: InvoiceMetaLookup,
): string {
  const products = items
    .map(
      (item) => {
        const invoiceMeta = getInvoiceMeta(item.codigo);

        return `Código: ${item.codigo}\nProducto: ${item.nombre}\nUnidad: ${
          invoiceMeta?.unidadPedido ?? "unidad"
        }\nCantidad: ${item.cantidad}`;
      },
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
  defaultWhatsappNumber = "",
  defaultEmail = "",
  products,
  stockAlerts,
  defaultFavorites = NO_DEFAULT_FAVORITES,
  getInvoiceMeta = getCominportInvoiceMeta,
}: SupplierCatalogPageProps) {
  const favoritesStorageKey = `${storagePrefix}_favorites`;
  const historyStorageKey = `${storagePrefix}_order_history`;
  const cartStorageKey = `${storagePrefix}_cart`;
  const observationsStorageKey = `${storagePrefix}_cart_observations`;
  const emailStorageKey = `${storagePrefix}_email`;
  const [cart, setCart] = useState<CominportCartItem[]>([]);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [orders, setOrders] = useState<CominportOrder[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [observations, setObservations] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [activeTab, setActiveTab] = useState<Tab>("catalogo");
  const [configMessage, setConfigMessage] = useState("");
  const [toast, setToast] = useState("");
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  // El carrito solo se rehidrata una vez: después manda el estado en memoria.
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const validCodes = new Set(products.map((product) => product.codigo));
    // La primera vez en este navegador se parte de la lista habitual del
    // restaurante; si el compañero ya tiene la suya guardada (aunque la haya
    // dejado vacía), manda la suya.
    const storedFavorites = hasStoredValue(favoritesStorageKey)
      ? readStoredArray<unknown>(favoritesStorageKey)
          .filter((value): value is string => typeof value === "string")
          .filter((codigo) => validCodes.has(codigo))
      : defaultFavorites.filter((codigo) => validCodes.has(codigo));

    setFavoriteCodes(storedFavorites);
    setOrders(readStoredArray<CominportOrder>(historyStorageKey));
    setCart(normalizeStoredCart(readStoredArray<unknown>(cartStorageKey), products));
    setObservations(readStoredString(observationsStorageKey));
    setWhatsappNumber(readStoredString(whatsappStorageKey) || defaultWhatsappNumber);
    setSupplierEmail(readStoredString(emailStorageKey) || defaultEmail);
    setHydrated(true);
  }, [
    cartStorageKey,
    defaultEmail,
    defaultFavorites,
    defaultWhatsappNumber,
    emailStorageKey,
    favoritesStorageKey,
    historyStorageKey,
    observationsStorageKey,
    products,
    whatsappStorageKey,
  ]);

  // Persistencia del carrito: sobrevive a recargas y a cerrar el navegador.
  useEffect(() => {
    if (!hydrated) return;
    saveStoredValue(cartStorageKey, cart);
  }, [cart, cartStorageKey, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredString(observationsStorageKey, observations);
  }, [hydrated, observations, observationsStorageKey]);

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

  const orderedUsage = useMemo(() => buildOrderedUsage(orders), [orders]);

  /** Lo ya pedido desde este panel manda sobre el orden del catálogo. */
  const sortedProducts = useMemo(
    () => rankByOwnOrders(products, orderedUsage),
    [orderedUsage, products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return sortedProducts.filter((product) => {
      const matchesCategory = category === "Todas" || product.categoria === category;
      const matchesSearch =
        !query ||
        product.nombre.toLocaleLowerCase("es").includes(query) ||
        (product.nombreEs?.toLocaleLowerCase("es").includes(query) ?? false) ||
        product.codigo.toLocaleLowerCase("es").includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search, sortedProducts]);

  useEffect(() => {
    setVisibleCount(CATALOG_PAGE_SIZE);
  }, [category, search]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const invoiceRankedProducts = useMemo(
    () =>
      products
        .filter((product) => Boolean(getInvoiceMeta(product.codigo)))
        .sort((a, b) => {
          const aMeta = getInvoiceMeta(a.codigo);
          const bMeta = getInvoiceMeta(b.codigo);
          if (!aMeta || !bMeta) return 0;
          return (
            bMeta.pedidosFactura - aMeta.pedidosFactura ||
            bMeta.cantidadFactura - aMeta.cantidadFactura ||
            a.codigo.localeCompare(b.codigo)
          );
        }),
    [getInvoiceMeta, products],
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

  /** Archiva el carrito en el historial y lo vacía tras un envío correcto. */
  const registerSentOrder = (estado: CominportOrder["estado"]) => {
    const order: CominportOrder = {
      id: createOrderId(storagePrefix),
      fecha: new Date().toISOString(),
      productos: cart.map((item) => ({ ...item })),
      cantidadTotal: totalQuantity,
      estado,
      observaciones: observations.trim(),
    };
    const nextOrders = [order, ...orders].slice(0, 100);
    setOrders(nextOrders);
    saveStoredValue(historyStorageKey, nextOrders);
    setCart([]);
    setObservations("");
  };

  const sendWhatsappOrder = () => {
    const normalizedNumber = whatsappNumber.replace(/\D/g, "");
    if (cart.length === 0) return;
    if (normalizedNumber.length < 6) {
      setConfigMessage("Guarda un número de WhatsApp válido antes de enviar.");
      return;
    }

    const message = buildWhatsappMessage(cart, observations, getInvoiceMeta);
    const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;

    saveStoredString(whatsappStorageKey, normalizedNumber);
    setWhatsappNumber(normalizedNumber);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    registerSentOrder("enviado_whatsapp");
    showToast("Pedido guardado en el historial");
  };

  const saveSupplierEmail = () => {
    const normalized = supplierEmail.trim();
    if (!EMAIL_PATTERN.test(normalized)) {
      setEmailMessage("Introduce un email válido (ej. pedidos@proveedor.com).");
      return;
    }
    saveStoredString(emailStorageKey, normalized);
    setSupplierEmail(normalized);
    setEmailMessage("Email guardado correctamente.");
  };

  const sendEmailOrder = async () => {
    const normalizedEmail = supplierEmail.trim();
    if (cart.length === 0 || sendingEmail) return;
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailMessage("Guarda un email válido antes de enviar.");
      return;
    }

    setSendingEmail(true);
    setEmailMessage("");
    try {
      const response = await fetch("/api/proveedores/pedido-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          to: normalizedEmail,
          observations,
          items: cart.map((item) => ({
            codigo: item.codigo,
            nombre: item.nombre,
            formato: item.formato,
            unidad: getInvoiceMeta(item.codigo)?.unidadPedido,
            cantidad: item.cantidad,
          })),
        }),
      });
      const data: { error?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEmailMessage(data.error || "No se pudo enviar el pedido por email.");
        return;
      }

      saveStoredString(emailStorageKey, normalizedEmail);
      setSupplierEmail(normalizedEmail);
      setEmailMessage(`Pedido enviado a ${normalizedEmail}.`);
      registerSentOrder("enviado_email");
      showToast("Pedido enviado por email y guardado en el historial");
    } catch {
      setEmailMessage("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setSendingEmail(false);
    }
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
    supplierEmail,
    emailMessage,
    sendingEmail,
    onSupplierEmailChange: (value: string) => {
      setSupplierEmail(value);
      setEmailMessage("");
    },
    onSaveSupplierEmail: saveSupplierEmail,
    onSendEmail: sendEmailOrder,
    getInvoiceMeta,
  };
  const hasInvoiceRanking = invoiceRankedProducts.length > 0;
  const mobileTabs: Array<{
    tab: Tab;
    label: string;
    Icon: LucideIcon;
    count: number;
  }> = [
    { tab: "catalogo", label: "Catálogo", Icon: PackageSearch, count: filteredProducts.length },
    ...(hasInvoiceRanking
      ? [
          {
            tab: "ranking" as const,
            label: "Ranking",
            Icon: ListOrdered,
            count: invoiceRankedProducts.length,
          },
        ]
      : []),
    { tab: "favoritos", label: "Favoritos", Icon: Heart, count: favoriteCodes.length },
    { tab: "historial", label: "Historial", Icon: History, count: orders.length },
    { tab: "carrito", label: "Carrito", Icon: ShoppingCart, count: totalQuantity },
  ];
  const desktopTabs: Array<{ tab: Tab; label: string; count: number }> = [
    { tab: "catalogo", label: "Catálogo", count: filteredProducts.length },
    ...(hasInvoiceRanking
      ? [{ tab: "ranking" as const, label: "Ranking facturas", count: invoiceRankedProducts.length }]
      : []),
    { tab: "favoritos", label: "Lista habitual", count: favoriteCodes.length },
    { tab: "historial", label: "Historial", count: orders.length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Ni título ni contadores: el nombre del proveedor ya sale en la cabecera
          de la ficha (/compras/<slug>) y las cifras de catálogo, favoritos y
          carrito ya van como globo en cada pestaña. Repetirlo costaba media
          pantalla de productos. */}

      {stockAlerts.length > 0 && (
        <section className="space-y-2">
          {stockAlerts.map((alert) => {
            const product = products.find((item) => item.codigo === alert.codigo);
            if (!product) return null;
            return (
              <div
                key={alert.codigo}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">
                      {alert.mensaje}
                    </p>
                    <p className="text-sm text-amber-700">
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

      <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por producto o código…"
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
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

      <nav
        className={`grid gap-1 rounded-xl bg-gray-200 p-1 lg:hidden ${
          hasInvoiceRanking ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {mobileTabs.map(({ tab, label, Icon, count }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-karuma-700 shadow-sm"
                : "text-gray-600"
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
          <nav
            className={`mb-4 hidden gap-1 rounded-xl bg-gray-200 p-1 lg:grid ${
              hasInvoiceRanking ? "lg:grid-cols-4" : "lg:grid-cols-3"
            }`}
          >
            {desktopTabs.map(({ tab, label, count }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab || (activeTab === "carrito" && tab === "catalogo")
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
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
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
                <PackageSearch className="mx-auto h-9 w-9 text-gray-300" />
                <p className="mt-3 font-medium text-gray-900">
                  No hay productos para esta búsqueda
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("Todas");
                  }}
                  className="mt-3 text-sm font-medium text-karuma-600 hover:text-karuma-700"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Mostrando {visibleProducts.length} de {filteredProducts.length} productos
                  {orderedUsage.size > 0 && (
                    <span className="text-karuma-600">
                      {" "}
                      · lo que ya has pedido aparece primero
                    </span>
                  )}
                </p>
                <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.codigo}
                      product={product}
                      isFavorite={favoriteCodes.includes(product.codigo)}
                      lowStock={lowStockCodes.has(product.codigo)}
                      orderedUsage={orderedUsage.get(product.codigo)}
                      getInvoiceMeta={getInvoiceMeta}
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
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Mostrar más ({filteredProducts.length - visibleProducts.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={activeTab === "ranking" ? "block" : "hidden"}>
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-base font-semibold text-gray-900">
                  Ranking facturas
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {invoiceRankedProducts.length} productos pedidos en facturas de {supplierName}.
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {invoiceRankedProducts.map((product, index) => {
                  const invoiceMeta = getInvoiceMeta(product.codigo);
                  if (!invoiceMeta) return null;

                  return (
                    <article
                      key={product.codigo}
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[64px_minmax(0,1fr)_180px_116px] sm:items-center"
                    >
                      <div className="flex items-center gap-2 sm:block">
                        <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-lg bg-karuma-50 px-2 text-sm font-bold text-karuma-700">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 sm:mt-1 sm:block">
                          {product.codigo}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {product.nombre}
                        </h3>
                        {product.nombreEs && (
                          <p className="truncate text-xs text-gray-600">{product.nombreEs}</p>
                        )}
                        <p className="truncate text-xs text-gray-500">
                          {product.formato}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:block sm:space-y-1">
                        <p className="font-medium text-karuma-700">
                          {invoiceMeta.unidadPedido}
                        </p>
                        <p className="text-gray-500">
                          {invoiceMeta.pedidosFactura} veces · {invoiceMeta.cantidadFactura} uds.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-karuma-600 px-3 py-2 text-sm font-medium text-white hover:bg-karuma-700"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Añadir
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className={activeTab === "favoritos" ? "block" : "hidden"}>
            <Favorites
              products={favoriteProducts}
              onAdd={addProduct}
              onAddAll={addAllFavorites}
              onRemove={toggleFavorite}
              getInvoiceMeta={getInvoiceMeta}
            />
          </div>

          <div className={activeTab === "historial" ? "block" : "hidden"}>
            <OrderHistory
              orders={orders}
              onAddAgain={addOrderAgain}
              getInvoiceMeta={getInvoiceMeta}
            />
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
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-tinta px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
