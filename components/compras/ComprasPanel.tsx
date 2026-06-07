"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CATEGORIAS_PROVEEDOR,
  EMPTY_PEDIDO_FORM,
  EMPTY_PROVEEDOR_FORM,
  ESTADOS_PEDIDO,
  ESTADOS_PROVEEDOR,
  computeStats,
  crearPedidoSugerido,
  exportPedidosCsv,
  exportProveedoresCsv,
  generarNumeroPedido,
  genId,
  getAlertasStock,
  loadCompras,
  parsePedidoForm,
  parseProveedorForm,
  pedidoToForm,
  proveedorToForm,
  recepcionarPedido,
  saveCompras,
  type PedidoForm,
  type ProveedorForm,
} from "@/lib/compras/helpers";
import { loadProductos } from "@/lib/inventario/helpers";
import { EstadoPedidoCompra, PedidoCompra, ProductoInventario, Proveedor } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "proveedores" | "pedidos" | "alertas";
type ModalKind = "proveedor" | "pedido" | "confirm" | null;

const pedidoEstadoConfig: Record<
  EstadoPedidoCompra,
  { variant: "warning" | "info" | "success" | "danger"; label: string }
> = {
  pendiente: { variant: "warning", label: "Pendiente" },
  enviado: { variant: "info", label: "Enviado" },
  recibido: { variant: "success", label: "Recibido" },
  cancelado: { variant: "danger", label: "Cancelado" },
};

function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
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

export function ComprasPanel() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [contadorPedido, setContadorPedido] = useState(1);
  const [productosInv, setProductosInv] = useState<ProductoInventario[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("proveedores");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editProvId, setEditProvId] = useState<string | null>(null);
  const [editPedId, setEditPedId] = useState<string | null>(null);
  const [provForm, setProvForm] = useState<ProveedorForm>(EMPTY_PROVEEDOR_FORM);
  const [pedForm, setPedForm] = useState<PedidoForm>(EMPTY_PEDIDO_FORM);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const refreshInventario = useCallback(() => {
    setProductosInv(loadProductos());
  }, []);

  useEffect(() => {
    try {
      const store = loadCompras();
      setProveedores(store.proveedores);
      setPedidos(store.pedidos);
      setContadorPedido(store.contadorPedido);
      refreshInventario();
    } finally {
      setLoaded(true);
    }
  }, [refreshInventario]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback(
    (nextProv: Proveedor[], nextPed: PedidoCompra[], nextContador?: number) => {
      setProveedores(nextProv);
      setPedidos(nextPed);
      const contador = nextContador ?? contadorPedido;
      if (nextContador !== undefined) setContadorPedido(nextContador);
      saveCompras({ proveedores: nextProv, pedidos: nextPed, contadorPedido: contador });
    },
    [contadorPedido],
  );

  const stats = useMemo(
    () => computeStats({ proveedores, pedidos, contadorPedido }),
    [proveedores, pedidos, contadorPedido],
  );

  const alertas = useMemo(() => getAlertasStock(productosInv), [productosInv]);

  const filteredProveedores = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.contacto.toLowerCase().includes(q) ||
        p.telefono.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.estado.toLowerCase().includes(q),
    );
  }, [proveedores, search]);

  const filteredPedidos = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pedidos;
    return pedidos.filter(
      (p) =>
        p.numeroPedido.toLowerCase().includes(q) ||
        p.proveedorNombre.toLowerCase().includes(q) ||
        p.producto.toLowerCase().includes(q) ||
        p.estado.toLowerCase().includes(q),
    );
  }, [pedidos, search]);

  const openProveedorModal = (mode: "add" | "edit", id?: string) => {
    setEditProvId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const prov = proveedores.find((p) => p.id === id);
      if (prov) setProvForm(proveedorToForm(prov));
    } else {
      setProvForm(EMPTY_PROVEEDOR_FORM);
    }
    setModal("proveedor");
  };

  const saveProveedor = () => {
    const parsed = parseProveedorForm(provForm);
    if (!parsed) {
      showToast("Completa el nombre del proveedor");
      return;
    }

    if (editProvId) {
      const next = proveedores.map((p) =>
        p.id === editProvId ? { ...p, ...parsed } : p,
      );
      persist(next, pedidos);
      showToast("Proveedor actualizado");
    } else {
      const nuevo: Proveedor = { id: genId(), ...parsed };
      persist([...proveedores, nuevo], pedidos);
      showToast("Proveedor añadido");
    }

    setModal(null);
    setProvForm(EMPTY_PROVEEDOR_FORM);
    setEditProvId(null);
  };

  const confirmDeleteProveedor = (id: string) => {
    const prov = proveedores.find((p) => p.id === id);
    if (!prov) return;
    setConfirmMessage(`¿Eliminar a «${prov.nombre}»? Esta acción no se puede deshacer.`);
    setConfirmAction(() => () => {
      persist(
        proveedores.filter((p) => p.id !== id),
        pedidos,
      );
      setModal(null);
      showToast("Proveedor eliminado");
    });
    setModal("confirm");
  };

  const openPedidoModal = (mode: "add" | "edit", id?: string) => {
    setEditPedId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const ped = pedidos.find((p) => p.id === id);
      if (ped) setPedForm(pedidoToForm(ped));
    } else {
      setPedForm({
        ...EMPTY_PEDIDO_FORM,
        proveedorId: proveedores.find((p) => p.estado === "activo")?.id ?? "",
      });
    }
    setModal("pedido");
  };

  const savePedido = () => {
    const parsed = parsePedidoForm(pedForm, proveedores);
    if (!parsed) {
      showToast("Completa proveedor y producto");
      return;
    }

    if (editPedId) {
      const existing = pedidos.find((p) => p.id === editPedId);
      if (!existing) return;
      const next = pedidos.map((p) =>
        p.id === editPedId
          ? { ...existing, ...parsed, numeroPedido: existing.numeroPedido }
          : p,
      );
      persist(proveedores, next);
      showToast("Pedido actualizado");
    } else {
      const nuevo: PedidoCompra = {
        id: genId(),
        numeroPedido: generarNumeroPedido(contadorPedido),
        ...parsed,
      };
      persist(proveedores, [...pedidos, nuevo], contadorPedido + 1);
      showToast("Pedido creado");
    }

    setModal(null);
    setPedForm(EMPTY_PEDIDO_FORM);
    setEditPedId(null);
  };

  const confirmDeletePedido = (id: string) => {
    const ped = pedidos.find((p) => p.id === id);
    if (!ped) return;
    setConfirmMessage(`¿Eliminar pedido «${ped.numeroPedido}»?`);
    setConfirmAction(() => () => {
      persist(proveedores, pedidos.filter((p) => p.id !== id));
      setModal(null);
      showToast("Pedido eliminado");
    });
    setModal("confirm");
  };

  const marcarRecibido = (id: string) => {
    const ped = pedidos.find((p) => p.id === id);
    if (!ped) return;

    const result = recepcionarPedido(ped);
    if (!result.ok) {
      showToast(result.error ?? "Error al recepcionar");
      return;
    }

    const next = pedidos.map((p) => (p.id === id ? { ...p, estado: "recibido" as const } : p));
    persist(proveedores, next);
    refreshInventario();
    showToast(`Pedido ${ped.numeroPedido} recibido — stock actualizado`);
  };

  const crearPedidoDesdeAlerta = (producto: ProductoInventario) => {
    const sugerido = crearPedidoSugerido(producto, proveedores, contadorPedido);
    persist(proveedores, [...pedidos, sugerido], contadorPedido + 1);
    setTab("pedidos");
    showToast(`Pedido sugerido ${sugerido.numeroPedido} creado`);
  };

  const updateProvForm = (field: keyof ProveedorForm, value: string) => {
    setProvForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePedForm = (field: keyof PedidoForm, value: string) => {
    setPedForm((prev) => ({ ...prev, [field]: value }));
  };

  const headerAction = () => {
    if (tab === "proveedores") {
      return (
        <Button size="sm" className="gap-1.5" onClick={() => openProveedorModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo proveedor</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      );
    }
    if (tab === "pedidos") {
      return (
        <Button size="sm" className="gap-1.5" onClick={() => openPedidoModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear pedido</span>
          <span className="sm:hidden">Pedido</span>
        </Button>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Proveedores, pedidos de compra y recepciones"
      >
        {headerAction()}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-4 sm:gap-4">
        <StatCard
          title="Pedidos pendientes"
          value={String(stats.pendientes)}
          icon={ClipboardList}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Pedidos recibidos"
          value={String(stats.recibidos)}
          icon={PackageCheck}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Gasto mes"
          value={formatCurrency(stats.gastoMes)}
          icon={Wallet}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Proveedores activos"
          value={String(stats.proveedoresActivos)}
          icon={Truck}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: "proveedores", label: "Proveedores", icon: Truck },
            { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
            { id: "alertas", label: "Alertas", icon: AlertTriangle },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSearch("");
              if (id === "alertas") refreshInventario();
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
              tab === id ? "bg-karuma-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab !== "alertas" && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "proveedores" ? "Buscar proveedor…" : "Buscar pedido…"}
              className={`${inputClass} pl-9`}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (tab === "proveedores") {
                exportProveedoresCsv(
                  search.trim() ? filteredProveedores : proveedores,
                );
              } else {
                exportPedidosCsv(search.trim() ? filteredPedidos : pedidos);
              }
              showToast("CSV exportado");
            }}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      )}

      {tab === "proveedores" && (
        <>
          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando proveedores…
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              {proveedores.length === 0
                ? "Sin proveedores. Pulsa Nuevo para añadir."
                : "Sin resultados para tu búsqueda."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProveedores.map((prov) => (
                <article
                  key={prov.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-gray-900">
                        {prov.nombre}
                      </h3>
                      <p className="text-xs text-gray-500">{prov.categoria}</p>
                    </div>
                    <StatusBadge variant={prov.estado === "activo" ? "success" : "danger"}>
                      {prov.estado === "activo" ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Contacto</dt>
                      <dd className="truncate text-gray-900">{prov.contacto || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Teléfono</dt>
                      <dd className="text-gray-900">{prov.telefono || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="truncate text-gray-900">{prov.email || "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => openProveedorModal("edit", prov.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 hover:bg-red-50"
                      onClick={() => confirmDeleteProveedor(prov.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "pedidos" && (
        <>
          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando pedidos…
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              {pedidos.length === 0
                ? "Sin pedidos. Pulsa Crear pedido."
                : "Sin resultados para tu búsqueda."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPedidos.map((ped) => (
                <article
                  key={ped.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ped.numeroPedido}</h3>
                      <p className="text-xs text-gray-500">
                        {formatDate(ped.fecha)} · {ped.proveedorNombre}
                      </p>
                    </div>
                    <StatusBadge variant={pedidoEstadoConfig[ped.estado].variant}>
                      {pedidoEstadoConfig[ped.estado].label}
                    </StatusBadge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-gray-500">Producto</dt>
                      <dd className="font-medium text-gray-900">{ped.producto}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Cantidad</dt>
                      <dd className="text-gray-900">
                        {ped.cantidad} {ped.unidad}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Coste</dt>
                      <dd className="font-medium text-gray-900">{formatCurrency(ped.coste)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {(ped.estado === "pendiente" || ped.estado === "enviado") && (
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => marcarRecibido(ped.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marcar recibido
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => openPedidoModal("edit", ped.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 hover:bg-red-50"
                      onClick={() => confirmDeletePedido(ped.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "alertas" && (
        <div className="space-y-4">
          <Card title="Alertas de stock">
            {alertas.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay alertas de salmón, arroz o atún con stock bajo.
              </p>
            ) : (
              <div className="space-y-3">
                {alertas.map((alerta) => (
                  <div
                    key={alerta.keyword}
                    className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-900">{alerta.mensaje}</p>
                        <p className="mt-1 text-xs text-amber-700">
                          Producto: {alerta.producto.nombre}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1 border-amber-300 bg-white hover:bg-amber-100"
                      onClick={() => crearPedidoDesdeAlerta(alerta.producto)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear pedido sugerido
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-xs text-gray-500">
            Las alertas se basan en el inventario actual. Al marcar un pedido como recibido, el
            stock se actualiza automáticamente.
          </p>
        </div>
      )}

      <Modal
        open={modal === "proveedor"}
        title={editProvId ? "Editar proveedor" : "Nuevo proveedor"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Nombre" required>
            <input
              type="text"
              value={provForm.nombre}
              onChange={(e) => updateProvForm("nombre", e.target.value)}
              placeholder="Ej. Makro"
              className={inputClass}
            />
          </Field>
          <Field label="Contacto">
            <input
              type="text"
              value={provForm.contacto}
              onChange={(e) => updateProvForm("contacto", e.target.value)}
              placeholder="Persona de contacto"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                type="tel"
                value={provForm.telefono}
                onChange={(e) => updateProvForm("telefono", e.target.value)}
                placeholder="+34 600 000 000"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={provForm.email}
                onChange={(e) => updateProvForm("email", e.target.value)}
                placeholder="pedidos@proveedor.es"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoría">
              <select
                value={provForm.categoria}
                onChange={(e) => updateProvForm("categoria", e.target.value)}
                className={inputClass}
              >
                {CATEGORIAS_PROVEEDOR.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={provForm.estado}
                onChange={(e) => updateProvForm("estado", e.target.value)}
                className={inputClass}
              >
                {ESTADOS_PROVEEDOR.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveProveedor}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "pedido"}
        title={editPedId ? "Editar pedido" : "Crear pedido"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Fecha" required>
            <input
              type="date"
              value={pedForm.fecha}
              onChange={(e) => updatePedForm("fecha", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Proveedor" required>
            <select
              value={pedForm.proveedorId}
              onChange={(e) => updatePedForm("proveedorId", e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar…</option>
              {proveedores
                .filter((p) => p.estado === "activo")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Producto" required>
            <input
              type="text"
              value={pedForm.producto}
              onChange={(e) => updatePedForm("producto", e.target.value)}
              placeholder="Ej. Salmón fresco"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Cantidad">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pedForm.cantidad}
                onChange={(e) => updatePedForm("cantidad", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Unidad">
              <input
                type="text"
                value={pedForm.unidad}
                onChange={(e) => updatePedForm("unidad", e.target.value)}
                placeholder="kg"
                className={inputClass}
              />
            </Field>
            <Field label="Coste €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pedForm.coste}
                onChange={(e) => updatePedForm("coste", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Estado">
            <select
              value={pedForm.estado}
              onChange={(e) => updatePedForm("estado", e.target.value)}
              className={inputClass}
            >
              {ESTADOS_PEDIDO.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={savePedido}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "confirm"} title="Confirmar" onClose={() => setModal(null)}>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>
            Cancelar
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => confirmAction?.()}>
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
