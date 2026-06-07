"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Database,
  Download,
  Link2,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  computeResumen,
  exportResumenCsv,
  generarAISummary,
  loadConfig,
  saveConfig,
  scanModules,
  sincronizarDatos,
  type DatosConfig,
  type ModuleInfo,
} from "@/lib/datos/helpers";
import { formatCurrency } from "@/lib/utils";

const sugerenciaStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

export function DatosPanel() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [config, setConfig] = useState<DatosConfig>({
    apiKey: "",
    apiUrl: "",
    lastSync: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiDraft, setApiDraft] = useState({ apiKey: "", apiUrl: "" });

  const refresh = useCallback(() => {
    setModules(scanModules());
    setConfig(loadConfig());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  const resumen = computeResumen();
  const sugerencias = generarAISummary(modules, resumen);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const handleSync = () => {
    const updated = sincronizarDatos();
    refresh();
    setConfig(updated);
    showToast("Datos sincronizados desde localStorage");
  };

  const handleRecalcular = () => {
    refresh();
    showToast("Métricas recalculadas");
  };

  const handleExport = () => {
    exportResumenCsv(resumen, modules);
    showToast("CSV exportado");
  };

  const openApiConfig = () => {
    setApiDraft({ apiKey: config.apiKey, apiUrl: config.apiUrl });
    setShowApiConfig(true);
  };

  const saveApiConfig = () => {
    const next = { ...config, apiKey: apiDraft.apiKey.trim(), apiUrl: apiDraft.apiUrl.trim() };
    saveConfig(next);
    setConfig(next);
    setShowApiConfig(false);
    showToast("Configuración API guardada (sin conexión real)");
  };

  const apiConectada = Boolean(config.apiKey && config.apiUrl);
  const modulosVisibles = modules;

  return (
    <div>
      <PageHeader
        title="Centro de Datos"
        description="Vista unificada de todos los módulos Karuma ERP"
      />

      {/* KPIs unificados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 sm:gap-4">
        <StatCard
          title="Ventas"
          value={formatCurrency(resumen.ventas)}
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Clientes"
          value={resumen.clientes > 0 ? String(resumen.clientes) : "—"}
          icon={Users}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Ticket medio"
          value={resumen.ticketMedio > 0 ? formatCurrency(resumen.ticketMedio) : "—"}
          icon={TrendingUp}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          title="Compras"
          value={formatCurrency(resumen.compras)}
          icon={ShoppingBag}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Coste personal"
          value={formatCurrency(resumen.costePersonal)}
          icon={Users}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Beneficio est."
          value={formatCurrency(resumen.beneficioEstimado)}
          trend={resumen.beneficioEstimado >= 0 ? "Positivo" : "Negativo"}
          trendUp={resumen.beneficioEstimado >= 0}
          icon={Wallet}
          iconColor={
            resumen.beneficioEstimado >= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
        />
        <StatCard
          title="Margen %"
          value={`${resumen.margenPct}%`}
          icon={Database}
          iconColor="bg-karuma-50 text-karuma-600"
        />
      </div>

      {resumen.fuentes.length > 0 && (
        <p className="mb-4 text-xs text-gray-500 sm:mb-6">
          Fuentes de datos: {resumen.fuentes.join(" · ")}
          {config.lastSync && (
            <>
              {" "}
              · Última sync:{" "}
              {new Intl.DateTimeFormat("es-ES", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(config.lastSync))}
            </>
          )}
        </p>
      )}

      {/* Sincronización */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:flex-row sm:flex-wrap">
        <Button size="sm" className="gap-1.5" onClick={handleSync}>
          <RefreshCw className="h-4 w-4" />
          Sincronizar datos
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRecalcular}>
          <Database className="h-4 w-4" />
          Recalcular métricas
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar resumen CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Estado módulos */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Estado de módulos</h2>
          {!loaded ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : (
            <div className="space-y-3">
              {modulosVisibles.map((mod) => (
                <div
                  key={mod.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{mod.nombre}</p>
                    <p className="truncate text-xs text-gray-500">
                      {mod.storageKey ?? "Sin clave"} · {mod.registros} registro(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <StatusBadge variant={mod.estado === "conectado" ? "success" : "warning"}>
                      {mod.estado === "conectado" ? "Conectado" : "Sin datos"}
                    </StatusBadge>
                    {mod.ultimaActualizacion && (
                      <span className="text-[10px] text-gray-400">
                        {mod.ultimaActualizacion}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Restosuite API Ready */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Restosuite API Ready</h2>
              <p className="mt-1 text-xs text-gray-500">
                Preparado para integración futura (sin conexión real).
              </p>
            </div>
            <StatusBadge variant={apiConectada ? "info" : "warning"}>
              {apiConectada ? "Configurado" : "No conectado"}
            </StatusBadge>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
            <WifiOff className="h-5 w-5 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-700">Estado API</p>
              <p className="text-sm text-gray-500">No conectado</p>
            </div>
          </div>

          {!showApiConfig ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openApiConfig}>
              <Link2 className="h-4 w-4" />
              Configurar integración
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiDraft.apiKey}
                  onChange={(e) => setApiDraft((p) => ({ ...p, apiKey: e.target.value }))}
                  placeholder="rs_live_xxxxxxxx"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  URL API
                </label>
                <input
                  type="url"
                  value={apiDraft.apiUrl}
                  onChange={(e) => setApiDraft((p) => ({ ...p, apiUrl: e.target.value }))}
                  placeholder="https://api.restosuite.com/v1"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveApiConfig}>
                  Guardar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowApiConfig(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {config.apiUrl && !showApiConfig && (
            <p className="mt-3 truncate text-xs text-gray-400">URL: {config.apiUrl}</p>
          )}
        </section>
      </div>

      {/* AI Data Summary */}
      <section className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-karuma-600" />
          <h2 className="text-sm font-semibold text-gray-900">AI Data Summary</h2>
        </div>

        {sugerencias.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border p-4 ${sugerenciaStyles[s.tipo]}`}
          >
            <p className="font-semibold">{s.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{s.mensaje}</p>
          </div>
        ))}
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
