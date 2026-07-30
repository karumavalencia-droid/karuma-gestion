"use client";

// Gestor genérico de una tabla financiera privada: lista + alta + borrado.
// Consume las API /api/owner/finanzas/* (todas exigen owner + aal2). Los
// importes se introducen en euros y se envían en céntimos.

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type FieldKind = "text" | "date" | "month" | "euros" | "select";

export interface FieldDef {
  key: string; // nombre del campo en el body de la API
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
}

export interface ColumnDef {
  label: string;
  render: (row: Record<string, unknown>) => string;
  align?: "left" | "right";
}

interface Props {
  endpoint: string;
  title: string;
  fields: FieldDef[];
  columns: ColumnDef[];
}

function eur(cents: unknown): string {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return "—";
  return (n / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export const fmtEuros = eur;

export function FinanceManager({ endpoint, title, fields, columns }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">(
    "loading",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setStatus("forbidden");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { items: Record<string, unknown>[] };
      setRows(data.items ?? []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildBody = (): Record<string, unknown> | { error: string } => {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = (form[f.key] ?? f.defaultValue ?? "").trim();
      if (!raw) {
        if (f.required) return { error: `Falta: ${f.label}` };
        continue;
      }
      if (f.kind === "euros") {
        const euros = Number(raw.replace(",", "."));
        if (!Number.isFinite(euros)) return { error: `Importe inválido: ${f.label}` };
        body[f.key] = Math.round(euros * 100);
      } else {
        body[f.key] = raw;
      }
    }
    return body;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const body = buildBody();
    if ("error" in body) {
      setError(body.error as string);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "No se pudo guardar.");
        setSaving(false);
        return;
      }
      setForm({});
      await load();
    } catch {
      setError("Error de red.");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("¿Borrar este registro?")) return;
    await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    }).catch(() => null);
    await load();
  };

  if (status === "forbidden") {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Necesitas verificar de nuevo tu identidad para ver estos datos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {fields.map((f) => (
          <label key={f.key} className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">{f.label}</span>
            {f.kind === "select" ? (
              <select
                value={form[f.key] ?? f.defaultValue ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.kind === "date" ? "date" : f.kind === "month" ? "month" : "text"}
                inputMode={f.kind === "euros" ? "decimal" : undefined}
                value={form[f.key] ?? f.defaultValue ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder={f.kind === "euros" ? "0,00 €" : ""}
              />
            )}
          </label>
        ))}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {saving ? "Guardando…" : "Añadir"}
          </button>
        </div>
        {error && (
          <p className="sm:col-span-2 lg:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              {columns.map((c) => (
                <th key={c.label} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {status === "loading" && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            )}
            {status === "ready" && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-400">
                  Sin registros.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-b border-gray-50">
                {columns.map((c) => (
                  <td key={c.label} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.render(row)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void remove(String(row.id))}
                    className="text-gray-400 hover:text-red-600"
                    aria-label="Borrar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
