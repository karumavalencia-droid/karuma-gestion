"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CATEGORIAS_FACTURA,
  EMPTY_FACTURA_FORM,
  computeStats,
  facturaToForm,
  genId,
  isImage,
  isPdf,
  loadFacturas,
  parseFacturaForm,
  readFileAsDataUrl,
  saveFacturas,
  type FacturaForm,
} from "@/lib/facturas/helpers";
import { CategoriaFactura, Factura, FacturasStore } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "lista" | "estadisticas";
type ModalKind = "form" | "preview" | "confirm" | null;

const categoriaVariant: Record<
  CategoriaFactura,
  "info" | "success" | "warning" | "danger" | "neutral"
> = {
  Factura: "neutral",
  Pescado: "info",
  Carne: "danger",
  Verdura: "success",
  Arroz: "warning",
  Bebidas: "info",
  Limpieza: "neutral",
  Packaging: "warning",
  Otros: "neutral",
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
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
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
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type FacturasApiResponse = {
  configured?: boolean;
  updatedAt?: string | null;
  facturas?: Factura[];
  error?: string;
};

function hasAttachment(factura: Factura): boolean {
  return Boolean(factura.archivoData || factura.archivoPath || factura.archivoUrl);
}

function facturaFileSrc(factura: Factura): string {
  if (factura.archivoData) return factura.archivoData;
  if (factura.archivoUrl && !factura.archivoPath) return factura.archivoUrl;
  return `/api/facturas/${encodeURIComponent(factura.id)}/file`;
}

export function FacturasPanel() {
  const [store, setStore] = useState<FacturasStore | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("lista");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<Factura | null>(null);
  const [preview, setPreview] = useState<Factura | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Factura | null>(null);
  const [form, setForm] = useState<FacturaForm>(EMPTY_FACTURA_FORM);
  const [archivoNuevo, setArchivoNuevo] = useState<{
    nombre: string;
    tipo: string;
    data: string;
  } | null>(null);
  const [formError, setFormError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaFactura | "">("");
  const [syncError, setSyncError] = useState("");
  const [toast, setToast] = useState("");

  const loadFromCloud = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/facturas", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as FacturasApiResponse;

      if (response.ok && data.configured) {
        setStore({ facturas: data.facturas ?? [] });
        setCloudReady(true);
        setSyncError("");
        return;
      }

      setCloudReady(false);
      setStore(loadFacturas());
      setSyncError("Modo local: la nube de facturas todavía no está disponible.");
    } catch {
      setCloudReady(false);
      setStore(loadFacturas());
      setSyncError("Modo local: no se pudo conectar con la nube de facturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromCloud();
  }, [loadFromCloud]);

  const persistLocal = useCallback((next: FacturasStore) => {
    saveFacturas(next);
    setStore(next);
  }, []);

  const saveFacturaRecord = async (factura: Factura) => {
    if (!store) return;

    if (!cloudReady) {
      const exists = store.facturas.some((f) => f.id === factura.id);
      const next = exists
        ? store.facturas.map((f) => (f.id === factura.id ? factura : f))
        : [factura, ...store.facturas];
      persistLocal({ facturas: next });
      return;
    }

    const response = await fetch("/api/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factura }),
    });
    const data = (await response.json().catch(() => ({}))) as FacturasApiResponse;
    if (!response.ok) {
      throw new Error(data.error || "No se pudo guardar la factura");
    }

    setStore({ facturas: data.facturas ?? [] });
    setCloudReady(true);
    setSyncError("");
  };

  const stats = useMemo(
    () => computeStats(store?.facturas ?? []),
    [store?.facturas],
  );

  const facturasFiltradas = useMemo(() => {
    const list = [...(store?.facturas ?? [])].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    return list.filter((f) => {
      const matchProv =
        !busqueda.trim() ||
        f.proveedor.toLowerCase().includes(busqueda.trim().toLowerCase());
      const matchCat = !filtroCategoria || f.categoria === filtroCategoria;
      return matchProv && matchCat;
    });
  }, [store?.facturas, busqueda, filtroCategoria]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FACTURA_FORM, fecha: new Date().toISOString().slice(0, 10) });
    setArchivoNuevo(null);
    setFormError("");
    setModal("form");
  };

  const openEdit = (f: Factura) => {
    setEditing(f);
    setForm(facturaToForm(f));
    setArchivoNuevo(null);
    setFormError("");
    setModal("form");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await readFileAsDataUrl(file);
      setArchivoNuevo({
        nombre: result.nombre,
        tipo: result.tipo,
        data: result.dataUrl,
      });
      setFormError("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al subir archivo");
      setArchivoNuevo(null);
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!store) return;

    const parsed = parseFacturaForm(
      form,
      archivoNuevo ?? undefined,
      editing ?? undefined,
    );

    if (!parsed) {
      setFormError("Completa fecha, proveedor e importe válido.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await saveFacturaRecord({
          ...editing,
          ...parsed,
          updatedAt: Date.now(),
        });
        showToast("Factura actualizada");
      } else {
        const nueva: Factura = {
          id: genId(),
          ...parsed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveFacturaRecord(nueva);
        showToast("Factura añadida");
      }

      setModal(null);
      setEditing(null);
      setArchivoNuevo(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar la factura");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!store || !deleteTarget) return;
    setSaving(true);
    try {
      if (cloudReady) {
        const response = await fetch(
          `/api/facturas?id=${encodeURIComponent(deleteTarget.id)}`,
          { method: "DELETE" },
        );
        const data = (await response.json().catch(() => ({}))) as FacturasApiResponse;
        if (!response.ok) {
          throw new Error(data.error || "No se pudo eliminar la factura");
        }
        setStore({ facturas: data.facturas ?? [] });
      } else {
        persistLocal({
          facturas: store.facturas.filter((f) => f.id !== deleteTarget.id),
        });
      }
      showToast("Factura eliminada");
      setModal(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo eliminar la factura");
    } finally {
      setSaving(false);
    }
  };

  const archivoActual = editing
    ? archivoNuevo ?? {
        nombre: editing.archivoNombre,
        tipo: editing.archivoTipo,
        data: editing.archivoData,
      }
    : archivoNuevo;

  const tieneArchivo = Boolean(archivoActual?.data || editing?.archivoPath || editing?.archivoUrl);

  if (loading || !store) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Cargando facturas…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Facturas"
        description={
          cloudReady
            ? "Archivo online de facturas de compras — Karuma Sushi & Grill"
            : "Archivo de facturas de compras — Karuma Sushi & Grill"
        }
      >
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nueva factura
        </Button>
      </PageHeader>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          cloudReady
            ? "border-green-100 bg-green-50 text-green-700"
            : "border-amber-100 bg-amber-50 text-amber-700"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {cloudReady
              ? "Facturas conectadas a la nube. Todos los dispositivos verán el mismo archivo."
              : syncError || "Facturas en modo local."}
          </span>
          <button
            type="button"
            onClick={loadFromCloud}
            className="inline-flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          title="Compras del mes"
          value={formatCurrency(stats.totalMes)}
          icon={Receipt}
          subtitle={`${stats.countMes} factura${stats.countMes !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Proveedores"
          value={String(stats.porProveedor.length)}
          icon={FileText}
          subtitle="con facturas registradas"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            title="Total facturas"
            value={String(store.facturas.length)}
            icon={BarChart3}
            subtitle="en el archivo"
          />
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {(
          [
            { id: "lista" as Tab, label: "Lista" },
            { id: "estadisticas" as Tab, label: "Estadísticas" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lista" && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Buscar proveedor…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
              <select
                value={filtroCategoria}
                onChange={(e) =>
                  setFiltroCategoria(e.target.value as CategoriaFactura | "")
                }
                className={inputClass}
              >
                <option value="">Todas las categorías</option>
                {CATEGORIAS_FACTURA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {facturasFiltradas.length} resultado
              {facturasFiltradas.length !== 1 ? "s" : ""}
            </p>
          </div>

          {facturasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No hay facturas que coincidan</p>
              <Button onClick={openNew} variant="secondary" className="mt-4">
                <Plus className="h-4 w-4" />
                Añadir factura
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {facturasFiltradas.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{f.proveedor}</p>
                        <StatusBadge variant={categoriaVariant[f.categoria]}>
                          {f.categoria}
                        </StatusBadge>
                        {hasAttachment(f) && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            {isPdf(f.archivoTipo) ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5" />
                            )}
                            Adjunto
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>{formatDate(f.fecha)}</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(f.importe)}
                        </span>
                      </div>
                      {f.observaciones && (
                        <p className="line-clamp-2 text-xs text-gray-500">{f.observaciones}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {hasAttachment(f) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreview(f);
                            setModal("preview");
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label="Vista previa"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(f);
                          setModal("confirm");
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "estadisticas" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Total por proveedor</h3>
            {stats.porProveedor.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {stats.porProveedor.map((p) => (
                  <li
                    key={p.proveedor}
                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-800">
                      {p.proveedor}
                    </span>
                    <span className="shrink-0 text-gray-600">
                      {formatCurrency(p.total)}
                      <span className="ml-1 text-xs text-gray-400">({p.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Total por categoría</h3>
            {stats.porCategoria.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {stats.porCategoria.map((c) => (
                  <li
                    key={c.categoria}
                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <StatusBadge variant={categoriaVariant[c.categoria]}>
                      {c.categoria}
                    </StatusBadge>
                    <span className="shrink-0 text-gray-600">
                      {formatCurrency(c.total)}
                      <span className="ml-1 text-xs text-gray-400">({c.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={modal === "form"}
        title={editing ? "Editar factura" : "Nueva factura"}
        onClose={() => setModal(null)}
        wide
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" required>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Importe (€)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.importe}
                onChange={(e) => setForm({ ...form, importe: e.target.value })}
                className={inputClass}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Proveedor" required>
            <input
              type="text"
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className={inputClass}
              placeholder="Nombre del proveedor"
            />
          </Field>

          <Field label="Categoría" required>
            <select
              value={form.categoria}
              onChange={(e) =>
                setForm({ ...form, categoria: e.target.value as CategoriaFactura })
              }
              className={inputClass}
            >
              {CATEGORIAS_FACTURA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="Notas opcionales"
              rows={3}
            />
          </Field>

          <Field label="Archivo (PDF, JPG, PNG)">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 transition-colors hover:border-karuma-400 hover:bg-karuma-50/50">
              <Upload className="h-4 w-4" />
              {archivoActual?.nombre || "Seleccionar archivo"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Máximo 2 MB por archivo. Para muchas facturas, las importaremos desde Drive.
            </p>
            {tieneArchivo && archivoActual && (
              <p className="mt-1 text-xs text-green-600">
                {isPdf(archivoActual.tipo) ? "PDF" : "Imagen"} listo: {archivoActual.nombre}
              </p>
            )}
          </Field>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {editing ? "Guardar cambios" : "Añadir factura"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "preview" && preview !== null}
        title="Vista previa"
        onClose={() => {
          setModal(null);
          setPreview(null);
        }}
        wide
      >
        {preview && hasAttachment(preview) && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {preview.archivoUrl && !preview.archivoPath && !preview.archivoData ? (
              <div className="space-y-3 p-6 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-600">
                  Esta factura está guardada como enlace de Google Drive.
                </p>
                <a
                  href={preview.archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
                >
                  Abrir factura
                </a>
              </div>
            ) : isPdf(preview.archivoTipo) ? (
              <iframe
                src={facturaFileSrc(preview)}
                title={preview.archivoNombre || "Factura PDF"}
                className="h-[60vh] w-full"
              />
            ) : isImage(preview.archivoTipo) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={facturaFileSrc(preview)}
                alt={preview.archivoNombre || "Factura"}
                className="mx-auto max-h-[60vh] w-full object-contain"
              />
            ) : (
              <p className="p-6 text-center text-sm text-gray-500">
                Formato no compatible para vista previa
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modal === "confirm" && deleteTarget !== null}
        title="Eliminar factura"
        onClose={() => {
          setModal(null);
          setDeleteTarget(null);
        }}
      >
        <p className="text-sm text-gray-600">
          ¿Eliminar la factura de <strong>{deleteTarget?.proveedor}</strong> (
          {deleteTarget && formatCurrency(deleteTarget.importe)})?
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setModal(null);
              setDeleteTarget(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={saving}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg sm:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
