"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  Package,
  PackageX,
  Pencil,
  Plus,
  Search,
  Trash2,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";
import {
  CATEGORIAS_DEFAULT,
  EMPTY_FORM,
  UNIDADES,
  computeStats,
  exportProductosCsv,
  fmtDate,
  fmtQty,
  genId,
  getEstadoLabel,
  getEstadoProducto,
  loadHistorial,
  loadProductos,
  parseForm,
  productToForm,
  saveHistorial,
  saveProductos,
  type ProductoForm,
} from "@/lib/inventario/helpers";
import { MovimientoInventario, ProductoInventario } from "@/lib/types";

type Tab = "inventario" | "historial";
type ModalKind = "product" | "movimiento" | "confirm" | null;

const estadoVariant = {
  correcto: "success" as const,
  bajo: "warning" as const,
  agotado: "danger" as const,
};

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

export function InventarioPanel() {
  const [products, setProducts] = useState<ProductoInventario[]>([]);
  const [historial, setHistorial] = useState<MovimientoInventario[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("inventario");
  const [search, setSearch] = useState("");
  const [histSearch, setHistSearch] = useState("");
  const [histType, setHistType] = useState<"all" | "entrada" | "salida">("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [movId, setMovId] = useState<string | null>(null);
  const [movType, setMovType] = useState<"entrada" | "salida">("entrada");
  const [movQty, setMovQty] = useState("");
  const [movNote, setMovNote] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [form, setForm] = useState<ProductoForm>(EMPTY_FORM);

  useEffect(() => {
    try {
      setProducts(loadProductos());
      setHistorial(loadHistorial());
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback(
    (nextProducts: ProductoInventario[], nextHistorial?: MovimientoInventario[]) => {
      setProducts(nextProducts);
      saveProductos(nextProducts);
      if (nextHistorial) {
        setHistorial(nextHistorial);
        saveHistorial(nextHistorial);
      }
    },
    [],
  );

  const addHistorial = useCallback(
    (
      productId: string,
      productName: string,
      type: "entrada" | "salida",
      qty: number,
      note: string,
    ) => {
      const entry: MovimientoInventario = {
        id: genId(),
        productId,
        productName,
        type,
        qty,
        note,
        ts: Date.now(),
      };
      const next = [entry, ...historial].slice(0, 500);
      setHistorial(next);
      saveHistorial(next);
      return next;
    },
    [historial],
  );

  const stats = useMemo(() => computeStats(products), [products]);

  const categories = useMemo(() => {
    const fromProducts = products.map((p) => p.categoria).filter(Boolean);
    return [...new Set([...CATEGORIAS_DEFAULT, ...fromProducts])].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = products.filter((p) => {
      const matchCat = activeCategory === "all" || p.categoria === activeCategory;
      const matchQ =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.proveedor.toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    if (sort === "name") list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (sort === "qty-asc") list = [...list].sort((a, b) => a.stock - b.stock);
    if (sort === "qty-desc") list = [...list].sort((a, b) => b.stock - a.stock);
    if (sort === "cat") list = [...list].sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));

    return list;
  }, [products, search, activeCategory, sort]);

  const filteredHistorial = useMemo(() => {
    const q = histSearch.toLowerCase().trim();
    return historial.filter((h) => {
      const matchType = histType === "all" || h.type === histType;
      const matchQ =
        !q ||
        h.productName.toLowerCase().includes(q) ||
        h.note.toLowerCase().includes(q);
      return matchType && matchQ;
    });
  }, [historial, histSearch, histType]);

  const openProductModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const product = products.find((p) => p.id === id);
      if (product) setForm(productToForm(product));
    } else {
      setForm(EMPTY_FORM);
    }
    setModal("product");
  };

  const saveProduct = () => {
    const parsed = parseForm(form);
    if (!parsed) {
      showToast("Completa nombre y categoría");
      return;
    }

    if (editId) {
      const idx = products.findIndex((p) => p.id === editId);
      if (idx === -1) return;
      const old = products[idx];
      const qtyDiff = parsed.stock - old.stock;
      const next = [...products];
      next[idx] = { ...old, ...parsed };
      persist(next);
      if (qtyDiff !== 0) {
        addHistorial(
          editId,
          parsed.nombre,
          qtyDiff > 0 ? "entrada" : "salida",
          Math.abs(qtyDiff),
          "Ajuste manual",
        );
      }
      showToast("Producto actualizado");
    } else {
      const product: ProductoInventario = {
        id: genId(),
        ...parsed,
        createdAt: Date.now(),
      };
      const next = [...products, product];
      persist(next);
      if (parsed.stock > 0) {
        addHistorial(product.id, product.nombre, "entrada", parsed.stock, "Stock inicial");
      }
      showToast("Producto añadido");
    }

    setModal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const openMovimiento = (productId: string, type: "entrada" | "salida") => {
    setMovId(productId);
    setMovType(type);
    setMovQty("");
    setMovNote("");
    setModal("movimiento");
  };

  const saveMovimiento = () => {
    const qty = parseFloat(movQty);
    if (!qty || qty <= 0) {
      showToast("Introduce una cantidad válida");
      return;
    }
    const idx = products.findIndex((p) => p.id === movId);
    if (idx === -1) return;
    const product = products[idx];
    if (movType === "salida" && product.stock < qty) {
      showToast("Stock insuficiente para esta salida");
      return;
    }

    const next = [...products];
    next[idx] = {
      ...product,
      stock: fmtQty(product.stock + (movType === "entrada" ? qty : -qty)),
    };
    persist(next);
    addHistorial(product.id, product.nombre, movType, qty, movNote.trim());
    setModal(null);
    showToast(movType === "entrada" ? "Entrada registrada" : "Salida registrada");
  };

  const confirmDelete = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setConfirmMessage(
      `¿Eliminar "${product.nombre}"? Se borrarán también sus movimientos del historial.`,
    );
    setConfirmAction(() => () => {
      const nextProducts = products.filter((p) => p.id !== id);
      const nextHistorial = historial.filter((h) => h.productId !== id);
      persist(nextProducts, nextHistorial);
      setModal(null);
      showToast("Producto eliminado");
    });
    setModal("confirm");
  };

  const updateForm = (field: keyof ProductoForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const currentMovProduct = movId ? products.find((p) => p.id === movId) : null;

  return (
    <div>
      <PageHeader title="Inventario" description="Control de stock y movimientos">
        <Button size="sm" className="gap-1.5" onClick={() => openProductModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo producto</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Productos"
          value={String(stats.productos)}
          icon={Package}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Unidades"
          value={String(stats.unidades)}
          icon={Boxes}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Stock bajo"
          value={String(stats.stockBajo)}
          icon={AlertTriangle}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Agotados"
          value={String(stats.agotados)}
          icon={PackageX}
          iconColor="bg-red-50 text-red-600"
        />
      </div>

      <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {(["inventario", "historial"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-karuma-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "inventario" ? "Inventario" : "Historial"}
          </button>
        ))}
      </div>

      {tab === "inventario" ? (
        <>
          <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={`${inputClass} sm:w-44`}
                >
                  <option value="name">Ordenar: Nombre</option>
                  <option value="qty-asc">Stock: Menor</option>
                  <option value="qty-desc">Stock: Mayor</option>
                  <option value="cat">Categoría</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => {
                    exportProductosCsv(products);
                    showToast("CSV exportado");
                  }}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-karuma-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-karuma-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando inventario…
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              {products.length === 0
                ? "Sin productos aún. Pulsa Nuevo para añadir."
                : "Sin resultados para tu búsqueda."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const estado = getEstadoProducto(product.stock, product.stockMinimo);
                return (
                  <article
                    key={product.id}
                    className={`rounded-xl border bg-white p-4 shadow-sm ${
                      estado === "agotado"
                        ? "border-red-200"
                        : estado === "bajo"
                          ? "border-amber-200"
                          : "border-gray-200"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900">
                          {product.nombre}
                        </h3>
                        <p className="text-xs text-gray-500">{product.categoria || "—"}</p>
                      </div>
                      <StatusBadge variant={estadoVariant[estado]}>
                        {getEstadoLabel(estado)}
                      </StatusBadge>
                    </div>

                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Stock actual</dt>
                        <dd className="font-medium text-gray-900">
                          {fmtQty(product.stock)} {product.unidad}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Stock mínimo</dt>
                        <dd className="text-gray-900">
                          {fmtQty(product.stockMinimo)} {product.unidad}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Unidad</dt>
                        <dd className="text-gray-900">{product.unidad}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Precio coste</dt>
                        <dd className="text-gray-900">{formatCurrency(product.precio)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Proveedor</dt>
                        <dd className="truncate text-right text-gray-900">
                          {product.proveedor || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Estado</dt>
                        <dd>
                          <StatusBadge variant={estadoVariant[estado]}>
                            {getEstadoLabel(estado)}
                          </StatusBadge>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openMovimiento(product.id, "entrada")}
                        title="Entrada"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        Entrada
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openMovimiento(product.id, "salida")}
                        title="Salida"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        Salida
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openProductModal("edit", product.id)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:bg-red-50"
                        onClick={() => confirmDelete(product.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                placeholder="Filtrar historial…"
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={histType}
              onChange={(e) => setHistType(e.target.value as typeof histType)}
              className={`${inputClass} sm:w-40`}
            >
              <option value="all">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
            </select>
          </div>

          {filteredHistorial.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              Sin movimientos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistorial.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      entry.type === "entrada"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {entry.type === "entrada" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{entry.productName}</p>
                    <p className="truncate text-xs text-gray-500">{entry.note || "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        entry.type === "entrada" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {entry.type === "entrada" ? "+" : "−"}
                      {fmtQty(entry.qty)}
                    </p>
                    <p className="text-[10px] text-gray-400">{fmtDate(entry.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={modal === "product"}
        title={editId ? "Editar producto" : "Nuevo producto"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Nombre" required>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => updateForm("nombre", e.target.value)}
              placeholder="Ej. Arroz jazmín"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoría" required>
              <select
                value={form.categoria}
                onChange={(e) => updateForm("categoria", e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar…</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unidad">
              <select
                value={form.unidad}
                onChange={(e) => updateForm("unidad", e.target.value)}
                className={inputClass}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Stock">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.stock}
                onChange={(e) => updateForm("stock", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <Field label="Stock mínimo">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.stockMinimo}
                onChange={(e) => updateForm("stockMinimo", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Precio coste">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={(e) => updateForm("precio", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
            <Field label="Proveedor">
              <input
                type="text"
                value={form.proveedor}
                onChange={(e) => updateForm("proveedor", e.target.value)}
                placeholder="Ej. Distribuciones Orientales"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveProduct}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "movimiento"}
        title={movType === "entrada" ? "Entrada de stock" : "Salida de stock"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Producto">
            <p className="text-sm font-medium text-gray-900">
              {currentMovProduct?.nombre ?? "—"}
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cantidad" required>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={movQty}
                onChange={(e) => setMovQty(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <Field label="Stock actual">
              <p className="pt-2 text-lg font-semibold text-karuma-600">
                {currentMovProduct
                  ? `${fmtQty(currentMovProduct.stock)} ${currentMovProduct.unidad}`
                  : "—"}
              </p>
            </Field>
          </div>

          <Field label="Motivo / Notas">
            <input
              type="text"
              value={movNote}
              onChange={(e) => setMovNote(e.target.value)}
              placeholder="Ej. Compra proveedor, uso cocina…"
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMovType("entrada")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                movType === "entrada"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              ↑ Entrada
            </button>
            <button
              type="button"
              onClick={() => setMovType("salida")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                movType === "salida"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              ↓ Salida
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveMovimiento}>Registrar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "confirm"}
        title="Confirmar"
        onClose={() => setModal(null)}
      >
        <p className="mb-4 text-sm leading-relaxed text-gray-600">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>
            Cancelar
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => confirmAction?.()}
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
