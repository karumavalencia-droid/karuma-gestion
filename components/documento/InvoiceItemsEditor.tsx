"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { InvoiceItemRow } from "@/lib/documentos/types";

type EditableInvoiceItem = {
  key: string;
  supplierId: number | null;
  rawProductName: string;
  normalizedProductId: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
};

function editableItem(item: InvoiceItemRow): EditableInvoiceItem {
  return {
    key: item.id,
    supplierId: item.supplier_id,
    rawProductName: item.raw_product_name,
    normalizedProductId: item.normalized_product_id,
    description: item.description || "",
    quantity: item.quantity == null ? "" : String(item.quantity),
    unit: item.unit || "",
    unitPrice: item.unit_price == null ? "" : String(item.unit_price),
    taxRate: item.tax_rate == null ? "" : String(item.tax_rate),
    lineTotal: item.line_total == null ? "" : String(item.line_total),
  };
}

function emptyItem(): EditableInvoiceItem {
  return {
    key: crypto.randomUUID(),
    supplierId: null,
    rawProductName: "",
    normalizedProductId: null,
    description: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    taxRate: "",
    lineTotal: "",
  };
}

export function InvoiceItemsEditor({
  documentId,
  items,
  available,
  humanVerified,
  currency,
  onSaved,
}: {
  documentId: string;
  items: InvoiceItemRow[];
  available: boolean;
  humanVerified: boolean;
  currency: string | null;
  onSaved: () => Promise<void>;
}) {
  const [editable, setEditable] = useState<EditableInvoiceItem[]>(() => items.map(editableItem));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEditable(items.map(editableItem));
  }, [items]);

  const lineSum = useMemo(
    () => editable.reduce((sum, item) => {
      const value = Number(item.lineTotal);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0),
    [editable],
  );
  const normalizedCurrency = currency?.trim().toUpperCase();
  const displayCurrency = normalizedCurrency && /^[A-Z]{3}$/.test(normalizedCurrency)
    ? normalizedCurrency
    : "EUR";

  function updateItem(key: string, patch: Partial<EditableInvoiceItem>) {
    setEditable((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documentos/${documentId}/invoice-items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editable.map((item) => ({
            supplier_id: item.supplierId,
            raw_product_name: item.rawProductName,
            normalized_product_id: item.normalizedProductId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            line_total: item.lineTotal,
          })),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudieron guardar las líneas");
      setMessage("Líneas guardadas y protegidas frente a nuevas reinterpretaciones AI.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron guardar las líneas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Líneas de factura</h2>
            {humanVerified ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-[10px] text-emerald-200"><Check className="h-3 w-3" />Verificadas</span> : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Conserva el nombre y la especificación exactos de la factura. Guardar estas líneas impide que una reanalización AI las sustituya.</p>
        </div>
        <button onClick={() => setEditable((current) => [...current, emptyItem()])} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-800/60 px-3 text-xs text-amber-200 hover:bg-amber-500/10">
          <Plus className="h-3.5 w-3.5" /> Añadir línea
        </button>
      </div>

      {!available ? <p className="rounded-xl border border-amber-900/40 bg-amber-500/5 p-3 text-xs text-amber-200">Las líneas estarán disponibles cuando se apliquen las migrations de Documento.</p> : null}

      <div className="space-y-3">
        {editable.map((item, index) => (
          <div key={item.key} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-amber-200">Línea {index + 1}</p>
              <button onClick={() => setEditable((current) => current.filter((candidate) => candidate.key !== item.key))} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950/30 hover:text-red-300" aria-label={`Eliminar línea ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <label className="sm:col-span-2 lg:col-span-3">
                <span className="field-label">Nombre original *</span>
                <input value={item.rawProductName} onChange={(event) => updateItem(item.key, { rawProductName: event.target.value })} className="line-input" placeholder="SALMÓN 7/8" />
              </label>
              <label className="sm:col-span-2 lg:col-span-3">
                <span className="field-label">Descripción / especificación</span>
                <input value={item.description} onChange={(event) => updateItem(item.key, { description: event.target.value })} className="line-input" placeholder="Fresco, pieza entera…" />
              </label>
              <label>
                <span className="field-label">Cantidad</span>
                <input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} className="line-input" />
              </label>
              <label>
                <span className="field-label">Unidad</span>
                <input value={item.unit} onChange={(event) => updateItem(item.key, { unit: event.target.value })} className="line-input" placeholder="kg" />
              </label>
              <label>
                <span className="field-label">Precio unidad</span>
                <input inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })} className="line-input" />
              </label>
              <label>
                <span className="field-label">IVA %</span>
                <input inputMode="decimal" value={item.taxRate} onChange={(event) => updateItem(item.key, { taxRate: event.target.value })} className="line-input" />
              </label>
              <label className="lg:col-span-2">
                <span className="field-label">Total línea</span>
                <input inputMode="decimal" value={item.lineTotal} onChange={(event) => updateItem(item.key, { lineTotal: event.target.value })} className="line-input" />
              </label>
            </div>
            {item.normalizedProductId ? <p className="mt-2 break-all text-[10px] text-zinc-600">Producto normalizado: {item.normalizedProductId}</p> : null}
          </div>
        ))}
      </div>

      {!editable.length ? <div className="rounded-xl border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-500">No hay líneas. Puedes guardar una factura sin líneas o añadirlas manualmente.</div> : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">Suma de líneas: <strong className="font-medium text-zinc-200">{new Intl.NumberFormat("es-ES", { style: "currency", currency: displayCurrency }).format(lineSum)}</strong></p>
        <Button variant="warning" onClick={() => void save()} disabled={saving || !available} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar líneas
        </Button>
      </div>
      {message ? <p className="mt-3 text-xs text-zinc-400">{message}</p> : null}
      <style jsx>{`.field-label { display: block; font-size: 0.6875rem; color: rgb(113 113 122); } .line-input { margin-top: 0.25rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(39 39 42); background: rgb(9 9 11); padding: 0.5rem 0.625rem; color: rgb(244 244 245); font-size: 0.75rem; outline: none; } .line-input:focus { border-color: rgb(217 119 6); }`}</style>
    </section>
  );
}
