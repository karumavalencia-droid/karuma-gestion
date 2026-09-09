"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, LoaderCircle, RefreshCw, WalletCards } from "lucide-react";
import Link from "next/link";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Payroll = {
  id: string;
  nombre: string;
  periodo: string | null;
  document_date: string | null;
  created_at: string;
  mime_type: string | null;
  tamano_bytes: number | null;
};

const labels = {
  es: {
    title: "Mis nóminas",
    subtitle: "Consulta y descarga tus nóminas personales.",
    empty: "Todavía no hay nóminas disponibles.",
    loading: "Cargando nóminas…",
    error: "No se pudieron cargar tus nóminas.",
    download: "Descargar",
    refresh: "Actualizar",
    back: "Volver",
    unknown: "Sin periodo",
  },
  zh: {
    title: "我的工资单",
    subtitle: "查看和下载你自己的工资单。",
    empty: "目前没有可用的工资单。",
    loading: "正在加载工资单…",
    error: "无法加载你的工资单。",
    download: "下载",
    refresh: "刷新",
    back: "返回",
    unknown: "未注明月份",
  },
} as const;

function periodLabel(periodo: string | null, date: string | null, locale: "es" | "zh") {
  const source = periodo ?? date?.slice(0, 7) ?? null;
  if (!source) return labels[locale].unknown;
  const match = /^(\d{4})-(\d{2})$/.exec(source);
  if (!match) return source;
  const month = Number(match[2]);
  const dateValue = new Date(Number(match[1]), month - 1, 1);
  return dateValue.toLocaleDateString(locale === "zh" ? "zh-CN" : "es-ES", {
    month: "long",
    year: "numeric",
  });
}

export default function MyPayrollPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const text = labels[locale];
  const [nominas, setNominas] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/nominas", { cache: "no-store" });
      const payload = (await response.json()) as { nominas?: Payroll[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? text.error);
      setNominas(payload.nominas ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.error);
    } finally {
      setLoading(false);
    }
  }, [text.error]);

  useEffect(() => {
    if (user?.employeeId) void load();
  }, [load, user?.employeeId]);

  const download = async (id: string) => {
    if (downloading) return;
    setDownloading(id);
    try {
      const response = await fetch(`/api/nominas/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? text.error);
      window.location.assign(payload.url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : text.error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 pb-28 pt-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/my-attendance" className="inline-flex items-center gap-2 text-sm text-gray-400">
            <ArrowLeft className="h-4 w-4" />
            {text.back}
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 disabled:opacity-50"
            aria-label={text.refresh}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <WalletCards className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="mt-1 text-sm text-gray-400">{text.subtitle}</p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            {text.loading}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>
        ) : nominas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
            <FileText className="mx-auto mb-3 h-8 w-8 opacity-60" />
            {text.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {nominas.map((nomina) => (
              <div key={nomina.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize">{periodLabel(nomina.periodo, nomina.document_date, locale)}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{nomina.nombre}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void download(nomina.id)}
                    disabled={downloading !== null}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
                  >
                    {downloading === nomina.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">{text.download}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <PortalTabs />
    </main>
  );
}
