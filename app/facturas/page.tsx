"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Receipt, RefreshCw, Search, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

type FacturaDocumento = {
  id: string;
  nombre: string;
  categoria: string;
  created_at: string;
  proveedor: string | null;
  nif_proveedor: string | null;
  fecha_documento: string | null;
  numero_documento: string | null;
  subtotal: number | string | null;
  iva: number | string | null;
  total: number | string | null;
  moneda: string | null;
  source_type: string | null;
  processing_status: string | null;
  extraction_confidence: number | string | null;
};

type ApiResponse = {
  documentos?: FacturaDocumento[];
  error?: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

function n(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-ES").format(new Date(year, month - 1, day));
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<FacturaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/documentos?categoria=facturas", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar las facturas");
      setFacturas(body.documentos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando facturas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const suppliers = useMemo(
    () =>
      Array.from(new Set(facturas.map((f) => f.proveedor).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [facturas],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("es");
    return facturas.filter((factura) => {
      const facturaMonth = factura.fecha_documento?.slice(0, 7) ?? "";
      if (month && facturaMonth !== month) return false;
      if (supplier && factura.proveedor !== supplier) return false;
      if (!q) return true;
      return [factura.proveedor, factura.numero_documento, factura.nombre, factura.nif_proveedor]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(q));
    });
  }, [facturas, month, search, supplier]);

  const eur = useMemo(() => filtered.filter((f) => (f.moneda || "EUR") === "EUR"), [filtered]);
  const usd = useMemo(() => filtered.filter((f) => f.moneda === "USD"), [filtered]);

  const eurSubtotal = useMemo(() => eur.reduce((sum, f) => sum + n(f.subtotal), 0), [eur]);
  const eurIva = useMemo(() => eur.reduce((sum, f) => sum + n(f.iva), 0), [eur]);
  const eurTotal = useMemo(() => eur.reduce((sum, f) => sum + n(f.total), 0), [eur]);
  const usdTotal = useMemo(() => usd.reduce((sum, f) => sum + n(f.total), 0), [usd]);

  const handleDownload = async (factura: FacturaDocumento) => {
    setDownloadingId(factura.id);
    setError("");
    try {
      const response = await fetch(`/api/documentos/${factura.id}`);
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "No se pudo abrir la factura");
      window.open(body.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error descargando la factura");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturas"
        description="Archivo privado de facturas · Gmail, Drive y cargas manuales · datos fiscales estructurados."
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Facturas"
          value={String(filtered.length)}
          subtitle={month ? monthLabel(month) : "Todos los periodos"}
          icon={Receipt}
        />
        <StatCard title="Base imponible" value={money(eurSubtotal)} subtitle="EUR" icon={FileText} />
        <StatCard title="IVA" value={money(eurIva)} subtitle="EUR" icon={WalletCards} />
        <StatCard title="Total facturado" value={money(eurTotal)} subtitle="EUR" icon={Receipt} />
        <StatCard
          title="Total USD"
          value={money(usdTotal, "USD")}
          subtitle={usd.length ? `${usd.length} factura${usd.length === 1 ? "" : "s"}` : "Sin facturas USD"}
          icon={WalletCards}
        />
      </div>

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-[180px_minmax(220px,1fr)_minmax(220px,1fr)_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Mes fiscal</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Proveedor</span>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass}>
              <option value="">Todos los proveedores</option>
              {suppliers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Proveedor, nº factura, NIF…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </Card>

      <Card title={`Archivo · ${filtered.length} factura${filtered.length === 1 ? "" : "s"}`}>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">Cargando facturas…</p>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-700">No hay facturas con estos filtros.</p>
            <p className="mt-1 text-xs text-gray-500">Cambia el mes, proveedor o búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-3">Fecha</th>
                  <th className="px-2 py-3">Proveedor</th>
                  <th className="px-2 py-3">Nº factura</th>
                  <th className="px-2 py-3 text-right">Base</th>
                  <th className="px-2 py-3 text-right">IVA</th>
                  <th className="px-2 py-3 text-right">Total</th>
                  <th className="px-2 py-3">Origen</th>
                  <th className="px-2 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((factura) => {
                  const currency = factura.moneda || "EUR";
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-2 py-3 text-gray-600">{dateLabel(factura.fecha_documento)}</td>
                      <td className="min-w-[220px] px-2 py-3">
                        <p className="font-medium text-gray-900">{factura.proveedor || "Sin proveedor"}</p>
                        {factura.nif_proveedor && <p className="mt-0.5 text-xs text-gray-500">{factura.nif_proveedor}</p>}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-gray-700">
                        {factura.numero_documento || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-gray-600">
                        {money(n(factura.subtotal), currency)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right text-gray-600">
                        {money(n(factura.iva), currency)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right font-semibold text-gray-900">
                        {money(n(factura.total), currency)}
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {factura.source_type || "manual"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDownload(factura)}
                          disabled={downloadingId === factura.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-karuma-700 hover:bg-karuma-50 disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingId === factura.id ? "Abriendo…" : "Abrir"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
